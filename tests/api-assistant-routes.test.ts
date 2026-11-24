import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as explainPost } from "@/app/api/assistant/explain/route";
import { POST as chatPost } from "@/app/api/assistant/chat/route";
import { DEFAULT_DEMO_PROFILE } from "@/lib/decision-engine/household-profile";
import { evaluateDailyPlan } from "@/lib/decision-engine/engine";
import { setCachedTelemetryForTesting } from "@/lib/telemetry/server-provider";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

const mockTelemetry: NormalizedTelemetry = {
  timestamp: "2026-11-24T12:00:00.000Z",
  retrievedAt: "2026-11-24T12:05:00.000Z",
  location: DEFAULT_LOCATION,
  source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
  dataKind: "modeled/forecast",
  freshness: "fresh",
  freshnessExplanation: "Telemetry within valid fresh window.",
  weather: {
    temperatureC: 18.5,
    apparentTemperatureC: 18.5,
    relativeHumidityPercent: 78,
    windSpeedKmH: 4.2,
    windDirectionDegrees: 310,
    surfacePressureHPa: 1012,
    weatherCode: 1,
    weatherLabel: "Clear",
  },
  aqi: {
    cpcbAqi: {
      standard: "IN_CPCB",
      name: "Indian National AQI",
      value: 380,
      category: "Very Poor",
      dominantPollutant: "PM2.5",
      subIndices: { pm2_5: 380, pm10: 290 },
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-red-700 bg-red-50",
      methodology: "model-derived-cpcb-method",
    },
    europeanAqi: {
      standard: "EU_EAQI",
      name: "European Air Quality Index",
      value: 5,
      category: "Very Poor",
      scaleMin: 1,
      scaleMax: 6,
      colorClass: "text-purple-700 bg-purple-50",
      methodology: "modeled-forecast",
    },
    usAqi: {
      standard: "US_EPA",
      name: "US EPA Air Quality Index",
      value: 210,
      category: "Very Unhealthy",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-purple-700 bg-purple-50",
      methodology: "modeled-forecast",
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "Particulate Matter PM2.5",
      value: 125,
      unit: "µg/m³",
      averagingPeriod: "24-hr rolling",
      status: "available",
    },
  ],
  hourlyForecast: [],
  disclaimer: "Modeled CAMS Global forecast",
};

describe("API Route — /api/assistant/explain", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCachedTelemetryForTesting("delhi-ncr", mockTelemetry);
  });

  it("returns 400 when request payload is empty or not valid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/explain", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await explainPost(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });

  it("returns 400 when request body fails schema validation", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/explain", {
      method: "POST",
      body: JSON.stringify({ incomplete: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await explainPost(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("validation failed");
  });

  it("returns 200 with structured verified explanation for a valid request", async () => {
    const plan = evaluateDailyPlan(DEFAULT_DEMO_PROFILE, mockTelemetry);
    const targetAction = plan.rankedActions[0];

    const validPayload = {
      actionId: targetAction.id,
      locationId: "delhi-ncr",
      profile: DEFAULT_DEMO_PROFILE,
      language: "en",
    };

    const req = new NextRequest("http://localhost:3000/api/assistant/explain", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await explainPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.explanation).toBeDefined();
    expect(json.explanation.headline).toBeDefined();
    expect(json.explanation.actionBreakdown).toBeDefined();
    expect(json.explanation.whyThisMatters).toBeDefined();
    expect(json.trustedMetadata.actionId).toBe(targetAction.id);
  });
});

describe("API Route — /api/assistant/chat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCachedTelemetryForTesting("delhi-ncr", mockTelemetry);
  });

  it("returns 400 when chat payload is not valid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
      method: "POST",
      body: "invalid-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await chatPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when chat request missing message", async () => {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ language: "en" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await chatPost(req);
    expect(res.status).toBe(400);
  });

  it("deflects medical inquiries with 200 status and Rule 12 clinical guardrails", async () => {
    const medicalPayload = {
      message: "Should I double my asthma inhaler dosage in this air quality?",
      locationId: "delhi-ncr",
      profile: DEFAULT_DEMO_PROFILE,
      language: "en",
    };

    const req = new NextRequest("http://localhost:3000/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify(medicalPayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await chatPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.response.isMedicalQuery).toBe(true);
    expect(json.response.answer).toContain("AERIS is an environmental decision-support companion and does not provide clinical diagnosis");
    expect(json.response.contextCitation).toContain("Rule 12");
  });
});
