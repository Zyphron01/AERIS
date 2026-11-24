import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/telemetry/route";
import { clearServerTelemetryCache } from "@/lib/telemetry/server-provider";

describe("API Route — /api/telemetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearServerTelemetryCache();
  });

  it("returns 400 when invalid coordinate bounds are provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/telemetry?lat=999&lon=999");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("Invalid coordinate bounds");
  });

  it("returns 400 when coordinates are non-numeric", async () => {
    const req = new NextRequest("http://localhost:3000/api/telemetry?lat=invalid&lon=77.2");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("Invalid coordinate bounds");
  });

  it("handles mock Open-Meteo responses gracefully and returns 200 with normalized telemetry", async () => {
    const mockWeather = {
      latitude: 28.6139,
      longitude: 77.209,
      generationtime_ms: 0.5,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      elevation: 214,
      current: {
        time: "2026-11-24T12:00",
        interval: 900,
        temperature_2m: 22.4,
        relative_humidity_2m: 60,
        apparent_temperature: 22.4,
        weather_code: 0,
        wind_speed_10m: 7.2,
        wind_direction_10m: 270,
        surface_pressure: 1014.2,
      },
      hourly: {
        time: ["2026-11-24T12:00"],
        temperature_2m: [22.4],
        relative_humidity_2m: [60],
        wind_speed_10m: [7.2],
        weather_code: [0],
      },
    };

    const mockAir = {
      latitude: 28.6139,
      longitude: 77.209,
      generationtime_ms: 0.5,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      elevation: 214,
      current: {
        time: "2026-11-24T12:00",
        interval: 3600,
        european_aqi: 3,
        us_aqi: 130,
        pm10: 120,
        pm2_5: 75,
        carbon_monoxide: 600,
        nitrogen_dioxide: 40,
        sulphur_dioxide: 15,
        ozone: 50,
        dust: 10,
      },
      hourly: {
        time: ["2026-11-24T12:00"],
        pm10: [120],
        pm2_5: [75],
        carbon_monoxide: [600],
        nitrogen_dioxide: [40],
        sulphur_dioxide: [15],
        ozone: [50],
        dust: [10],
        us_aqi: [130],
        european_aqi: [3],
      },
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("api.open-meteo.com/v1/forecast")) {
        return Promise.resolve(new Response(JSON.stringify(mockWeather), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(mockAir), { status: 200 }));
    });

    const req = new NextRequest("http://localhost:3000/api/telemetry?locationId=mumbai");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.location.id).toBe("mumbai");
    expect(json.aqi.cpcbAqi).toBeDefined();
    const pm25 = json.pollutants.find((p: { code: string; value: number }) => p.code === "pm2_5");
    expect(pm25?.value).toBe(75);
  });

  it("sets X-AERIS-Cache MISS then HIT and isolates custom coordinate cache entries", async () => {
    const mockWeather = {
      latitude: 28.6139,
      longitude: 77.209,
      generationtime_ms: 0.4,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      elevation: 214,
      current: {
        time: "2026-11-24T12:00",
        interval: 900,
        temperature_2m: 20,
        relative_humidity_2m: 55,
        apparent_temperature: 20,
        weather_code: 0,
        wind_speed_10m: 6,
        wind_direction_10m: 270,
        surface_pressure: 1013,
      },
      hourly: {
        time: ["2026-11-24T12:00"],
        temperature_2m: [20],
        relative_humidity_2m: [55],
        wind_speed_10m: [6],
        weather_code: [0],
      },
    };
    const mockAir = {
      latitude: 28.6139,
      longitude: 77.209,
      generationtime_ms: 0.4,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      elevation: 214,
      current: {
        time: "2026-11-24T12:00",
        interval: 3600,
        european_aqi: 3,
        us_aqi: 150,
        pm10: 110,
        pm2_5: 80,
        carbon_monoxide: 500,
        nitrogen_dioxide: 35,
        sulphur_dioxide: 12,
        ozone: 45,
        dust: 8,
      },
      hourly: {
        time: ["2026-11-24T12:00"],
        pm10: [110],
        pm2_5: [80],
        carbon_monoxide: [500],
        nitrogen_dioxide: [35],
        sulphur_dioxide: [12],
        ozone: [45],
        dust: [8],
        us_aqi: [150],
        european_aqi: [3],
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("api.open-meteo.com/v1/forecast")) {
        return Promise.resolve(new Response(JSON.stringify(mockWeather), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(mockAir), { status: 200 }));
    });
    globalThis.fetch = fetchMock;

    // 1. First request for SiteA -> MISS
    const resA1 = await GET(
      new NextRequest("http://localhost:3000/api/telemetry?lat=28.6139&lon=77.209&name=SiteA")
    );
    expect(resA1.status).toBe(200);
    expect(resA1.headers.get("X-AERIS-Cache")).toBe("MISS");
    expect((await resA1.json()).location.name).toBe("SiteA");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 2. Second request for SiteA -> HIT (no new upstream fetch)
    const resA2 = await GET(
      new NextRequest("http://localhost:3000/api/telemetry?lat=28.6139&lon=77.209&name=SiteA")
    );
    expect(resA2.status).toBe(200);
    expect(resA2.headers.get("X-AERIS-Cache")).toBe("HIT");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 3. Request at same coordinates with different name SiteB -> MISS & isolated
    const resB = await GET(
      new NextRequest("http://localhost:3000/api/telemetry?lat=28.6139&lon=77.209&name=SiteB")
    );
    expect(resB.status).toBe(200);
    expect(resB.headers.get("X-AERIS-Cache")).toBe("MISS");
    expect((await resB.json()).location.name).toBe("SiteB");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
