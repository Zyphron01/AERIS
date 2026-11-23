import { describe, it, expect } from "vitest";
import {
  evaluateWindowAndVentilation,
  evaluateSourceReduction,
  generateIndoorAirPlan,
} from "@/lib/indoor-air/rules";
import { computePurifierAdvisor } from "@/lib/indoor-air/calculations";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type {
  UserReportedIndoorConditions,
  OptionalIndoorSensors,
  CostParameters,
} from "@/lib/indoor-air/types";

describe("Indoor Air — Rules Engine & Scientific Priorities", () => {
  const baseTelemetry: NormalizedTelemetry = {
    timestamp: "2026-11-21T06:00:00Z",
    retrievedAt: "2026-11-21T06:10:00Z",
    location: {
      id: "delhi-ncr",
      name: "Delhi NCR",
      region: "NCR",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
      modelDomain: "CAMS Global",
    },
    source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
    dataKind: "modeled/forecast",
    freshness: "fresh",
    freshnessExplanation: "Telemetry within valid window.",
    weather: {
      temperatureC: 38.0, // Hot weather
      apparentTemperatureC: 41.0,
      relativeHumidityPercent: 70,
      windSpeedKmH: 5.0,
      windDirectionDegrees: 280,
      surfacePressureHPa: 1010,
      weatherCode: 1,
      weatherLabel: "Clear",
    },
    aqi: {
      cpcbAqi: {
        standard: "IN_CPCB",
        name: "Indian National AQI",
        value: 320,
        category: "Very Poor",
        dominantPollutant: "PM2.5",
        subIndices: { pm2_5: 320, pm10: 210 },
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-red-700 bg-red-50",
        methodology: "model-derived-cpcb-method",
        calculationBasis: "Modeled CPCB-method estimate.",
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
        value: 220,
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
        name: "PM2.5",
        value: 145.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        status: "available",
      },
      {
        code: "pm10",
        name: "PM10",
        value: 260.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        status: "available",
      },
    ],
    hourlyForecast: [],
    disclaimer: "Modeled estimate.",
  };

  const defaultCosts: CostParameters = {
    electricityTariffPerKwh: 8.0,
    annualFilterReplacementCost: 2500,
    currency: "INR",
  };

  describe("Window & Ventilation Logic & Safety Overrides", () => {
    it("triggers Heat Stress Safety Override with context-dependent heat warning when room is hot (>=35°C)", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "bedroom",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["none"],
        occupancyCount: 2,
        perceivedStuffiness: "stuffy_drowsy",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "too_hot", // Dangerously hot
      };

      const action = evaluateWindowAndVentilation(baseTelemetry, userState, null);
      expect(action.priority).toBe("urgent");
      expect(action.category).toBe("thermal_safety");
      expect(action.title).toContain("Heat Stress Safety Override");
      expect(action.actionText).toContain("Thermal safety takes absolute priority over particulate sealing");
      expect(action.actionText).toContain("electric fans alone provide diminishing cooling and may accelerate dehydration");
      expect(action.actionText).toContain("combine fan airflow with skin wetting (sponging or misting)");
    });

    it("triggers Heat Stress Safety Override with shaded ventilation when room is hot (<35°C)", () => {
      const moderateHotTelemetry: NormalizedTelemetry = {
        ...baseTelemetry,
        weather: {
          ...baseTelemetry.weather,
          temperatureC: 32.0,
        },
      };

      const userState: UserReportedIndoorConditions = {
        roomType: "bedroom",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["none"],
        occupancyCount: 2,
        perceivedStuffiness: "stuffy_drowsy",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "too_hot",
      };

      const action = evaluateWindowAndVentilation(moderateHotTelemetry, userState, null);
      expect(action.priority).toBe("urgent");
      expect(action.category).toBe("thermal_safety");
      expect(action.actionText).toContain("Thermal safety takes priority over particulate sealing");
      expect(action.actionText).toContain("shaded or leeward side of the residence");
    });

    it("triggers Combustion Dilution Priority with distinguished appliance inspection and acute gas emergency notices", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "kitchen",
        windowState: "all_closed",
        combustionSources: ["cooking_unvented"],
        dustActivities: ["none"],
        occupancyCount: 1,
        perceivedStuffiness: "odorous",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "comfortable",
      };

      const action = evaluateWindowAndVentilation(baseTelemetry, userState, null);
      expect(action.priority).toBe("urgent");
      expect(action.category).toBe("ventilation");
      expect(action.title).toContain("Ventilate Kitchen Directly");
      expect(action.actionText).toContain("1) URGENT GAS & CO EMERGENCY: If you smell gas");
      expect(action.actionText).toContain("call emergency services (112 in India / 911 in US) from outside");
      expect(action.actionText).toContain("2) APPLIANCE INSPECTION: If stove burner flames are persistently yellow or orange");
      expect(action.actionText).toContain("3) FILTRATION LIMIT: Mechanical particle filters (HEPA) DO NOT remove carbon monoxide");
      expect(action.whyItMatters).toContain("nitrogen dioxide (NO2)");
      expect(action.whyItMatters).toContain("Mechanical particle purifiers do not remove carbon monoxide");
    });

    it("encourages natural room flushing when outdoor PM2.5 is relatively favorable (<= 35 µg/m³)", () => {
      const cleanTelemetry: NormalizedTelemetry = {
        ...baseTelemetry,
        pollutants: [
          { code: "pm2_5", name: "PM2.5", value: 18.0, unit: "µg/m³", averagingPeriod: "24h", status: "available" },
        ],
      };

      const userState: UserReportedIndoorConditions = {
        roomType: "living_room",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["none"],
        occupancyCount: 2,
        perceivedStuffiness: "normal",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "comfortable",
      };

      const action = evaluateWindowAndVentilation(cleanTelemetry, userState, null);
      expect(action.priority).toBe("low");
      expect(action.title).toContain("Natural Air Exchange & Room Flushing Window");
      expect(action.actionText).toContain("brief cross-ventilation (typically 5 to 15 minutes, depending on wind speed and draft strength)");
    });

    it("advises tightly sealing building envelope when outdoor air is polluted and no overrides apply", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "bedroom",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["none"],
        occupancyCount: 1,
        perceivedStuffiness: "normal",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: true,
        thermalComfort: "comfortable",
      };

      const action = evaluateWindowAndVentilation(baseTelemetry, userState, null);
      expect(action.priority).toBe("high");
      expect(action.title).toContain("Maintain Sealed Building Envelope");
    });
  });

  describe("Source Elimination Rules", () => {
    it("generates incense elimination action when burning candles/incense are reported", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "living_room",
        windowState: "all_closed",
        combustionSources: ["incense_candles"],
        dustActivities: ["none"],
        occupancyCount: 2,
        perceivedStuffiness: "odorous",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "comfortable",
      };

      const actions = evaluateSourceReduction(userState);
      const incenseAction = actions.find((a) => a.id === "indoor-action-eliminate-incense");
      expect(incenseAction).toBeDefined();
      expect(incenseAction?.priority).toBe("high");
      expect(incenseAction?.costTier).toBe("zero_cost");
      expect(incenseAction?.whyItMatters).toContain("benzene, toluene, and formaldehyde");
    });

    it("generates damp cleaning guidance when dry sweeping is reported", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "living_room",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["sweeping"],
        occupancyCount: 1,
        perceivedStuffiness: "normal",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "comfortable",
      };

      const actions = evaluateSourceReduction(userState);
      const sweepAction = actions.find((a) => a.id === "indoor-action-wet-cleaning-protocol");
      expect(sweepAction).toBeDefined();
      expect(sweepAction?.title).toContain("Transition from Dry Sweeping to Damp Mopping");
      expect(sweepAction?.actionText).toContain("damp microfiber mop");
    });
  });

  describe("Master Plan Generation & Measurement Status", () => {
    it("strictly labels status as 'unmeasured_modeled' when no physical indoor sensor is provided", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "bedroom",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["none"],
        occupancyCount: 1,
        perceivedStuffiness: "normal",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: true,
        thermalComfort: "comfortable",
      };

      const purifier = computePurifierAdvisor(
        { length: 4, width: 3, height: 2.5, unit: "meters" },
        { hasPurifier: false, knownCadrM3h: null, knownCadrCfm: null, dailyOperatingHours: 8, ratedWattage: null },
        defaultCosts,
        145,
        "limited"
      );

      const plan = generateIndoorAirPlan(baseTelemetry, userState, null, purifier);
      expect(plan.indoorMeasurementStatus).toBe("unmeasured_modeled");
      expect(plan.summary).toContain("Indoor PM2.5 is not measured");
      expect(plan.actions.length).toBeGreaterThan(0);
    });

    it("strictly labels status as 'measured' and quotes sensor reading when physical sensor is provided", () => {
      const userState: UserReportedIndoorConditions = {
        roomType: "bedroom",
        windowState: "all_closed",
        combustionSources: ["none"],
        dustActivities: ["none"],
        occupancyCount: 1,
        perceivedStuffiness: "normal",
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: true,
        thermalComfort: "comfortable",
      };

      const sensors: OptionalIndoorSensors = {
        pm25Value: 48,
        co2Ppm: 920,
        temperatureC: 24.5,
        humidityPercent: 55,
        deviceLabel: "Qingping Air Monitor Lite",
      };

      const purifier = computePurifierAdvisor(
        { length: 4, width: 3, height: 2.5, unit: "meters" },
        { hasPurifier: true, knownCadrM3h: 240, dailyOperatingHours: 8, knownCadrCfm: null, ratedWattage: 25 },
        defaultCosts,
        145,
        "flexible"
      );

      const plan = generateIndoorAirPlan(baseTelemetry, userState, sensors, purifier);
      expect(plan.indoorMeasurementStatus).toBe("measured");
      expect(plan.summary).toContain("Indoor physical sensor reports 48 µg/m³ PM2.5");
      expect(plan.measuredSensors?.deviceLabel).toBe("Qingping Air Monitor Lite");
    });
  });
});
