import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { OutdoorVsIndoorCard } from "@/components/indoor-air/outdoor-vs-indoor-card";
import { IndoorConditionsPanel } from "@/components/indoor-air/indoor-conditions-panel";
import { PurifierAdvisorWidget } from "@/components/indoor-air/purifier-advisor-widget";
import { IndoorRecommendationsList } from "@/components/indoor-air/indoor-recommendations-list";
import type {
  UserReportedIndoorConditions,
  OptionalIndoorSensors,
  IndoorGuidanceAction,
} from "@/lib/indoor-air/types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

describe("Indoor Air UI Components", () => {
  const sampleConditions: UserReportedIndoorConditions = {
    roomType: "bedroom",
    windowState: "all_closed",
    combustionSources: ["none"],
    dustActivities: ["none"],
    occupancyCount: 2,
    perceivedStuffiness: "normal",
    hasExhaustFanRunning: false,
    hasAirConditionerRunning: false,
    thermalComfort: "comfortable",
  };

  const sampleSensors: OptionalIndoorSensors = {
    pm25Value: 18,
    co2Ppm: 650,
    temperatureC: 24,
    humidityPercent: 50,
  };

  const sampleTelemetry: NormalizedTelemetry = {
    location: {
      id: "delhi-ncr",
      name: "Delhi NCR",
      region: "NCR",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
    },
    source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
    dataKind: "modeled/forecast",
    timestamp: "2026-11-21T18:00:00Z",
    retrievedAt: "2026-11-21T18:05:00Z",
    freshness: "fresh",
    freshnessExplanation: "Telemetry verified within 15 minutes",
    weather: {
      temperatureC: 28,
      apparentTemperatureC: 30,
      relativeHumidityPercent: 60,
      windSpeedKmH: 12,
      windDirectionDegrees: 280,
      surfacePressureHPa: 1012,
      weatherCode: 1,
      weatherLabel: "Clear",
    },
    aqi: {
      usAqi: {
        standard: "US_EPA",
        name: "US EPA Air Quality Index",
        value: 175,
        category: "Unhealthy",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-rose-700 bg-rose-50",
        methodology: "modeled-forecast",
      },
      europeanAqi: {
        standard: "EU_EAQI",
        name: "European Air Quality Index",
        value: 4,
        category: "Poor",
        scaleMin: 1,
        scaleMax: 6,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "modeled-forecast",
      },
      cpcbAqi: {
        standard: "IN_CPCB",
        name: "Indian National AQI (CPCB Methodology)",
        value: 260,
        category: "Poor",
        dominantPollutant: "PM2.5",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "model-derived-cpcb-method",
      },
    },
    pollutants: [
      {
        code: "pm2_5",
        name: "PM2.5",
        value: 95,
        unit: "µg/m³",
        averagingPeriod: "1-hour instantaneous",
        status: "available",
      },
      {
        code: "pm10",
        name: "PM10",
        value: 160,
        unit: "µg/m³",
        averagingPeriod: "1-hour instantaneous",
        status: "available",
      },
    ],
    hourlyForecast: [],
    disclaimer: "Modeled CPCB AQI Estimate.",
  };

  const sampleActions: readonly IndoorGuidanceAction[] = [
    {
      id: "indoor-air-flushing-clean",
      category: "ventilation",
      priority: "high",
      costTier: "zero_cost",
      title: "Clean Air Opportunity: Flush Indoor Air",
      actionText: "Open opposite windows for 15-20 minutes to purge accumulated carbon dioxide.",
      whyItMatters: "Natural cross-ventilation flushes indoor CO2 and VOCs.",
      evidenceReferences: ["ASHRAE 62.2 Ventilation Standard"],
      tradeOffs: "May admit outdoor dust if wind picks up.",
      uncertaintyNotice: "Effectiveness depends on building orientation.",
      assumptions: ["Wind velocity > 3 km/h"],
    },
    {
      id: "indoor-air-damp-mopping",
      category: "source_reduction",
      priority: "moderate",
      costTier: "zero_cost",
      title: "Transition from Dry Sweeping to Damp Mopping",
      actionText: "Use damp microfiber cloths instead of dry brooms.",
      whyItMatters: "Dry brooms aerosolize settled coarse PM10 particles.",
      evidenceReferences: ["EPA Indoor airPLUS Cleaning Guidance"],
      tradeOffs: "Requires slightly more labor and water.",
      uncertaintyNotice: "Floor dust composition varies by footwear habits.",
      assumptions: ["Microfiber captures 90% of coarse particulates"],
    },
  ];

  describe("OutdoorVsIndoorCard", () => {
    it("renders unmeasured modeled state with required cautionary label", () => {
      render(
        <OutdoorVsIndoorCard
          telemetry={sampleTelemetry}
          sensors={null}
          isPurifierRunning={false}
        />
      );

      expect(screen.getByText("Outdoor Ambient Air")).toBeDefined();
      expect(screen.getByText("Indoor Status")).toBeDefined();
      expect(screen.getByText("Unmeasured / No In-Room Sensor")).toBeDefined();
      expect(screen.getByText("Indoor PM2.5 not measured")).toBeDefined();
      expect(screen.getByText(/Notice: Unmeasured Estimate & Illustrative Sensitivity Exercise/i)).toBeDefined();
      expect(screen.getByText(/never a personalized prediction interval or measurement/i)).toBeDefined();
      expect(screen.getByText(/Illustrative Infiltration Range/i)).toBeDefined();
    });

    it("renders measured sensor state when physical sensor data is provided", () => {
      render(
        <OutdoorVsIndoorCard
          telemetry={sampleTelemetry}
          sensors={sampleSensors}
          isPurifierRunning={true}
        />
      );

      expect(screen.getByText("Measured Observation")).toBeDefined();
      expect(screen.getByText(/18 µg\/m³/i)).toBeDefined();
      expect(screen.getByText(/650 ppm/i)).toBeDefined();
    });
  });

  describe("IndoorConditionsPanel", () => {
    it("renders room choices and window state dropdowns and fires onConditionsChange", () => {
      const onChange = vi.fn();
      render(
        <IndoorConditionsPanel
          conditions={sampleConditions}
          onConditionsChange={onChange}
          sensors={null}
          onSensorsChange={vi.fn()}
        />
      );

      expect(screen.getByText("Room & Behavioral Setup")).toBeDefined();
      expect(screen.getByText("Active Room Type")).toBeDefined();
      expect(screen.getByText("Window & Exterior Openings")).toBeDefined();

      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2);
      fireEvent.change(selects[0], { target: { value: "kitchen" } });
      expect(onChange).toHaveBeenCalled();
    });

    it("allows toggling combustion sources and fires onConditionsChange", () => {
      const onChange = vi.fn();
      render(
        <IndoorConditionsPanel
          conditions={sampleConditions}
          onConditionsChange={onChange}
          sensors={null}
          onSensorsChange={vi.fn()}
        />
      );

      const gasBtn = screen.getByRole("button", { name: "Unvented Gas Stove" });
      fireEvent.click(gasBtn);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("PurifierAdvisorWidget", () => {
    it("renders room dimensions and displays CADR target and EPA 2/3 benchmark", () => {
      render(
        <PurifierAdvisorWidget
          outdoorPm25={95}
          budgetPreference="limited"
        />
      );

      expect(screen.getByText("Budget-Aware Purifier Sizing & Cost Advisor")).toBeDefined();
      expect(screen.getByText("Target Clean Air Rate")).toBeDefined();
      expect(screen.getByText("EPA 2/3 Benchmark")).toBeDefined();
    });

    it("displays zero-cost alternative advice when budget is no_cost", () => {
      render(
        <PurifierAdvisorWidget
          outdoorPm25={95}
          budgetPreference="no_cost"
        />
      );

      expect(screen.getByText("Zero-Cost Alternative:")).toBeDefined();
      expect(screen.getByText(/If you prefer not to purchase equipment/i)).toBeDefined();
    });
  });

  describe("IndoorRecommendationsList", () => {
    it("renders ranked actions with category badges and cost tier tags", () => {
      render(
        <IndoorRecommendationsList
          actions={sampleActions}
          measurementStatus="unmeasured_modeled"
        />
      );

      expect(screen.getByText("Clean Air Opportunity: Flush Indoor Air")).toBeDefined();
      expect(screen.getByText("Transition from Dry Sweeping to Damp Mopping")).toBeDefined();
      expect(screen.getAllByText("Zero-Cost").length).toBeGreaterThan(0);
    });

    it("expands technical assumptions when button is clicked", () => {
      render(
        <IndoorRecommendationsList
          actions={sampleActions}
          measurementStatus="unmeasured_modeled"
        />
      );

      const expandBtn = screen.getAllByRole("button", {
        name: /view engineering assumptions/i,
      })[0];
      fireEvent.click(expandBtn);

      expect(screen.getByText("Underlying Technical Assumptions:")).toBeDefined();
      expect(screen.getByText("Wind velocity > 3 km/h")).toBeDefined();
    });

    it("filters actions when category button is clicked", () => {
      render(
        <IndoorRecommendationsList
          actions={sampleActions}
          measurementStatus="unmeasured_modeled"
        />
      );

      const sourceCtrlBtn = screen.getByRole("button", { name: "Source Control" });
      fireEvent.click(sourceCtrlBtn);

      expect(screen.getByText("Transition from Dry Sweeping to Damp Mopping")).toBeDefined();
      expect(screen.queryByText("Clean Air Opportunity: Flush Indoor Air")).toBeNull();
    });
  });
});
