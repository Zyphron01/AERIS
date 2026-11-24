import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTelemetry } from "@/lib/telemetry/use-telemetry";
import { DEFAULT_LOCATION, findLocationById } from "@/lib/telemetry/locations";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

function makeTelemetry(locationId: string): NormalizedTelemetry {
  const loc = findLocationById(locationId);
  return {
    location: loc,
    source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
    dataKind: "modeled/forecast",
    timestamp: "2026-11-24T12:00:00Z",
    retrievedAt: "2026-11-24T12:05:00Z",
    freshness: "fresh",
    freshnessExplanation: "Fresh",
    weather: {
      temperatureC: 25,
      apparentTemperatureC: 25,
      relativeHumidityPercent: 50,
      windSpeedKmH: 8,
      windDirectionDegrees: 180,
      surfacePressureHPa: 1013,
      weatherCode: 0,
      weatherLabel: "Clear Sky",
    },
    aqi: {
      usAqi: {
        standard: "US_EPA",
        name: "US EPA AQI",
        value: 100,
        category: "Moderate",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-amber-700 bg-amber-50",
        methodology: "modeled-forecast",
      },
      europeanAqi: {
        standard: "EU_EAQI",
        name: "EU EAQI",
        value: 3,
        category: "Moderate",
        scaleMin: 1,
        scaleMax: 6,
        colorClass: "text-amber-700 bg-amber-50",
        methodology: "modeled-forecast",
      },
      cpcbAqi: {
        standard: "IN_CPCB",
        name: "CPCB NAQI",
        value: locationId === "mumbai" ? 180 : 320,
        category: locationId === "mumbai" ? "Moderate" : "Very Poor",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "model-derived-cpcb-method",
      },
    },
    pollutants: [],
    hourlyForecast: [],
    disclaimer: "Modeled forecast",
  };
}

describe("useTelemetry hook", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("issues exactly one request per city change and clears old-city telemetry while pending", async () => {
    let resolveMumbai!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("locationId=delhi-ncr")) {
        return Promise.resolve(
          new Response(JSON.stringify(makeTelemetry("delhi-ncr")), { status: 200 })
        );
      }
      return new Promise<Response>((resolve) => {
        resolveMumbai = resolve;
      });
    });
    globalThis.fetch = fetchMock;

    const { result, rerender } = renderHook(
      ({ locId }) => useTelemetry(locId),
      { initialProps: { locId: DEFAULT_LOCATION.id } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.telemetry?.location.id).toBe("delhi-ncr");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Switch city to Mumbai
    rerender({ locId: "mumbai" });

    // Exactly 1 new request, and old-city telemetry is NOT shown while pending
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/telemetry?locationId=mumbai",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.isLoading).toBe(true);
    expect(result.current.telemetry).toBeNull();

    await act(async () => {
      resolveMumbai(new Response(JSON.stringify(makeTelemetry("mumbai")), { status: 200 }));
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.telemetry?.location.id).toBe("mumbai");
  });

  it("cancels in-flight requests on rapid city switching and ignores stale responses", async () => {
    const signals: AbortSignal[] = [];
    const resolvers: Array<(res: Response) => void> = [];

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise<Response>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { result, rerender } = renderHook(
      ({ locId }) => useTelemetry(locId),
      { initialProps: { locId: "delhi-ncr" } }
    );

    rerender({ locId: "mumbai" });
    rerender({ locId: "bengaluru" });

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(true);
    expect(signals[2]?.aborted).toBe(false);

    // Resolve stale Delhi response first — must NOT overwrite Bengaluru
    await act(async () => {
      resolvers[0](new Response(JSON.stringify(makeTelemetry("delhi-ncr")), { status: 200 }));
    });
    expect(result.current.telemetry).toBeNull();

    // Resolve active Bengaluru response
    await act(async () => {
      resolvers[2](new Response(JSON.stringify(makeTelemetry("bengaluru")), { status: 200 }));
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.telemetry?.location.id).toBe("bengaluru");
  });

  it("handles network errors, retry, and refresh", async () => {
    let shouldFail = true;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      if (shouldFail) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Upstream unavailable" }), { status: 502 })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify(makeTelemetry("delhi-ncr")), { status: 200 })
      );
    });

    const { result } = renderHook(() => useTelemetry("delhi-ncr"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe("Upstream unavailable");
    expect(result.current.telemetry).toBeNull();

    // Retry and succeed
    shouldFail = false;
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.telemetry?.location.id).toBe("delhi-ncr");

    // Refresh while data is already loaded
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.telemetry?.location.id).toBe("delhi-ncr");
  });
});
