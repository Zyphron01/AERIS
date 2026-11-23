import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ScenarioHeader } from "@/components/scenarios/scenario-header";
import { ScenarioTabs } from "@/components/scenarios/scenario-tabs";
import { OutdoorTimingPanel } from "@/components/scenarios/outdoor-timing-panel";
import { IndoorVsOutdoorPanel } from "@/components/scenarios/indoor-vs-outdoor-panel";
import { CommuteModePanel } from "@/components/scenarios/commute-mode-panel";
import { FiltrationHypotheticalPanel } from "@/components/scenarios/filtration-hypothetical-panel";
import { DecisionReceiptCard } from "@/components/scenarios/decision-receipt-card";
import { LowEmissionCard } from "@/components/scenarios/low-emission-card";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { ScenarioComparisonResult } from "@/lib/scenarios/types";

describe("Scenario Simulator UI Components", () => {
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
    timestamp: "2026-11-22T06:00:00Z",
    retrievedAt: "2026-11-22T06:10:00Z",
    freshness: "fresh",
    freshnessExplanation: "Telemetry verified within 15 minutes",
    weather: {
      temperatureC: 22,
      apparentTemperatureC: 22,
      relativeHumidityPercent: 60,
      windSpeedKmH: 8,
      windDirectionDegrees: 280,
      surfacePressureHPa: 1012,
      weatherCode: 1,
      weatherLabel: "Clear",
    },
    aqi: {
      usAqi: { standard: "US_EPA", name: "US EPA AQI", value: 175, category: "Unhealthy", scaleMin: 0, scaleMax: 500, colorClass: "text-rose-700", methodology: "modeled-forecast" },
      europeanAqi: { standard: "EU_EAQI", name: "EU AQI", value: 4, category: "Poor", scaleMin: 1, scaleMax: 6, colorClass: "text-orange-700", methodology: "modeled-forecast" },
      cpcbAqi: { standard: "IN_CPCB", name: "Indian National AQI", value: 260, category: "Poor", scaleMin: 0, scaleMax: 500, colorClass: "text-orange-700", methodology: "model-derived-cpcb-method" },
    },
    pollutants: [{ code: "pm2_5", name: "PM2.5", value: 110, unit: "µg/m³", averagingPeriod: "1-hour", status: "available" }],
    hourlyForecast: [
      { time: "2026-11-22T06:00:00Z", pm2_5: 140, pm10: 220, usAqi: 195, temperatureC: 18, humidityPercent: 75, windSpeedKmH: 4 },
      { time: "2026-11-22T13:00:00Z", pm2_5: 65, pm10: 110, usAqi: 156, temperatureC: 26, humidityPercent: 45, windSpeedKmH: 12 },
    ],
    disclaimer: "Modeled CPCB AQI Estimate.",
  };

  const sampleResult: ScenarioComparisonResult = {
    scenarioType: "outdoor_timing",
    baseline: {
      label: "Baseline Schedule (06:00 AM)",
      description: "Forecasted outdoor ambient conditions at 06:00 AM.",
      forecastTime: "2026-11-22T06:00:00Z",
      forecastedPm25: 140,
      forecastedAqi: 195,
      forecastedAqiCategory: "Unhealthy",
      temperatureC: 18,
      isHypotheticalSimulated: false,
      contextNotes: ["Atmospheric model forecast: 140 µg/m³ PM2.5."],
    },
    alternative: {
      label: "Alternative Schedule (01:00 PM)",
      description: "Forecasted outdoor ambient conditions shifted to 01:00 PM.",
      forecastTime: "2026-11-22T13:00:00Z",
      forecastedPm25: 65,
      forecastedAqi: 156,
      forecastedAqiCategory: "Unhealthy for Sensitive Groups",
      temperatureC: 26,
      isHypotheticalSimulated: false,
      contextNotes: ["Atmospheric model forecast: 65 µg/m³ PM2.5."],
    },
    delta: {
      pm25Difference: -75,
      pm25Unit: "µg/m³",
      qualitativeAssessment: "substantially_better",
      summaryText: "Shifting activity to 01:00 PM aligns with a forecasted window of lower ambient fine particulate concentration (75 µg/m³ lower).",
    },
    receipt: {
      receiptId: "rcpt-test-1234",
      generatedAt: "2026-11-22T06:00:00Z",
      locationName: "Delhi NCR",
      dataSource: "Open-Meteo Air Quality",
      forecastFreshness: "Fresh: telemetry received within last 90 minutes",
      scenarioType: "outdoor_timing",
      baselineLabel: "Baseline Schedule (06:00 AM)",
      alternativeLabel: "Alternative Schedule (01:00 PM)",
      applicableRuleId: "aeris-rule-outdoor-exercise",
      ruleTitle: "Adaptive Outdoor Schedule & Dispersion Window Alignment",
      primaryFinding: "Shifting activity to 01:00 PM aligns with a forecasted window of lower ambient fine particulate concentration.",
      tradeOffs: "Requires shifting daily routine and managing higher midday solar temperature.",
      assumptions: ["Similar physical exertion across both periods."],
      scientificNotice: "Forecast comparison reflects ambient chemical transport modeling, not individual lung deposition.",
    },
    lowEmissionAlternative: {
      title: "Diurnal Dispersion Coordination",
      description: "Aligning physical recreation with mid-day thermal dispersion.",
      emissionCategory: "zero_emission",
      actionText: "Avoid heavy cardiovascular exercise during winter dawn thermal inversion hours.",
      sustainabilityBenefit: "Encourages active mobility during clean atmospheric windows.",
    },
    disclaimer: "Comparison is based on validated hourly atmospheric forecasts.",
  };

  describe("ScenarioHeader", () => {
    it("renders title, location selector, and back link", () => {
      const onLocChange = vi.fn();
      render(
        <ScenarioHeader
          telemetry={sampleTelemetry}
          activeLocationId="delhi-ncr"
          onLocationChange={onLocChange}
        />
      );

      expect(screen.getByText("What-If Scenario Simulator")).toBeDefined();
      expect(screen.getByRole("link", { name: /Back to Home/i }).getAttribute("href")).toBe("/");

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "mumbai" } });
      expect(onLocChange).toHaveBeenCalledWith("mumbai");
    });
  });

  describe("ScenarioTabs", () => {
    it("renders all 4 tabs and fires onTypeChange", () => {
      const onTypeChange = vi.fn();
      render(
        <ScenarioTabs
          activeType="outdoor_timing"
          onTypeChange={onTypeChange}
        />
      );

      expect(screen.getByText("Outdoor Timing")).toBeDefined();
      expect(screen.getByText("Indoor vs. Outdoor")).toBeDefined();
      expect(screen.getByText("Commute Modality")).toBeDefined();
      expect(screen.getByText("Filtration Sizing")).toBeDefined();

      const commuteBtn = screen.getByText("Commute Modality");
      fireEvent.click(commuteBtn);
      expect(onTypeChange).toHaveBeenCalledWith("commute_mode");
    });
  });

  describe("OutdoorTimingPanel", () => {
    it("renders baseline and alternative hour selectors", () => {
      const onChange = vi.fn();
      render(
        <OutdoorTimingPanel
          telemetry={sampleTelemetry}
          value={{
            scenarioType: "outdoor_timing",
            baselineHourIso: "2026-11-22T06:00:00Z",
            alternativeHourIso: "2026-11-22T13:00:00Z",
            activityType: "exercise",
          }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Outdoor Schedule & Dispersion Window Comparison")).toBeDefined();
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBe(3);
    });
  });

  describe("IndoorVsOutdoorPanel", () => {
    it("renders filtration active/passive toggle buttons", () => {
      const onChange = vi.fn();
      render(
        <IndoorVsOutdoorPanel
          telemetry={sampleTelemetry}
          value={{
            scenarioType: "indoor_vs_outdoor",
            forecastHourIso: "2026-11-22T06:00:00Z",
            indoorFiltrationActive: false,
            roomVentilationState: "sealed_windows",
          }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Indoor Microclimate vs. Outdoor Ambient Air")).toBeDefined();
      const hepaBtn = screen.getByRole("button", { name: "Active HEPA Purifier" });
      fireEvent.click(hepaBtn);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("CommuteModePanel", () => {
    it("renders baseline and alternative commute choices", () => {
      const onChange = vi.fn();
      render(
        <CommuteModePanel
          telemetry={sampleTelemetry}
          value={{
            scenarioType: "commute_mode",
            forecastHourIso: "2026-11-22T06:00:00Z",
            baselineMode: "active_walking_biking",
            alternativeMode: "closed_public_transit_metro",
          }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Commute Modality & Physical Barrier Comparison")).toBeDefined();
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBe(3);
    });
  });

  describe("FiltrationHypotheticalPanel", () => {
    it("renders room volume, CADR inputs, and calculated ACH", () => {
      const onChange = vi.fn();
      render(
        <FiltrationHypotheticalPanel
          telemetry={sampleTelemetry}
          value={{
            scenarioType: "filtration_hypothetical",
            roomVolumeCuM: 30,
            ratedCadrM3h: 240,
            fanSpeedMode: "maximum_certified",
          }}
          onChange={onChange}
        />
      );

      expect(screen.getByText("Mechanical Filtration Sizing & Air Exchange Simulation")).toBeDefined();
      expect(screen.getByText(/8 ACH/)).toBeDefined(); // 240 / 30 = 8.0 ACH
      expect(screen.getByText("Hypothetical Simulation")).toBeDefined();
    });
  });

  describe("DecisionReceiptCard", () => {
    it("renders receipt ID, baseline, alternative, delta, and copy button", () => {
      render(<DecisionReceiptCard result={sampleResult} />);

      expect(screen.getByText(/Decision Receipt/i)).toBeDefined();
      expect(screen.getByText("#rcpt-test-1234")).toBeDefined();
      expect(screen.getByText("Baseline Schedule (06:00 AM)")).toBeDefined();
      expect(screen.getByText("Alternative Schedule (01:00 PM)")).toBeDefined();
      expect(screen.getAllByText(/140 µg\/m³/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/65 µg\/m³/i).length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: /Copy decision receipt text/i })).toBeDefined();
    });
  });

  describe("LowEmissionCard", () => {
    it("renders sustainable action and co-benefits", () => {
      render(<LowEmissionCard alternative={sampleResult.lowEmissionAlternative} />);

      expect(screen.getByText("Sustainable Choice & Clean Air Synergy")).toBeDefined();
      expect(screen.getByText("Diurnal Dispersion Coordination")).toBeDefined();
      expect(screen.getByText(/Encourages active mobility during clean atmospheric windows/i)).toBeDefined();
    });
  });
});
