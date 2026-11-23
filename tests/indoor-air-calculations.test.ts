import { describe, it, expect } from "vitest";
import {
  normalizeRoomGeometry,
  calculateRequiredCadr,
  calculateEpaTwoThirdsCadr,
  evaluateExistingPurifier,
  estimatePurifierPowerWatts,
  calculateOperatingCosts,
  computePurifierAdvisor,
  TARGET_ACH,
  FEET_PER_METER,
  CUFT_PER_CUM,
  M3H_PER_CFM,
} from "@/lib/indoor-air/calculations";
import type {
  RoomDimensions,
  ExistingPurifierSpecs,
  CostParameters,
} from "@/lib/indoor-air/types";

describe("Indoor Air — Purifier Sizing & Engineering Calculations", () => {
  describe("Geometry Normalization & Unit Conversions", () => {
    it("correctly calculates metric area and volume from meter inputs", () => {
      const dims: RoomDimensions = {
        length: 4.0,
        width: 3.5,
        height: 2.5,
        unit: "meters",
      };

      const geom = normalizeRoomGeometry(dims);
      expect(geom.lengthM).toBe(4.0);
      expect(geom.widthM).toBe(3.5);
      expect(geom.heightM).toBe(2.5);
      expect(geom.areaSqM).toBe(14.0);
      expect(geom.volumeCuM).toBe(35.0);
      // Square feet check: 14 * 10.7639 ~= 150.7 sq ft
      expect(geom.areaSqFt).toBeCloseTo(150.7, 0);
    });

    it("correctly converts feet inputs into normalized metric dimensions", () => {
      const dims: RoomDimensions = {
        length: 12.0, // ft
        width: 10.0, // ft
        height: 8.0, // ft (standard ceiling)
        unit: "feet",
      };

      const geom = normalizeRoomGeometry(dims);
      expect(geom.areaSqFt).toBe(120.0);
      expect(geom.volumeCuFt).toBe(960.0);
      // 120 sq ft / 10.7639 ~= 11.15 sq m
      expect(geom.areaSqM).toBeCloseTo(11.15, 1);
      // 960 cu ft / 35.3147 ~= 27.18 cu m
      expect(geom.volumeCuM).toBeCloseTo(27.18, 1);
    });

    it("correctly accounts for high ceilings proportionally increasing room volume", () => {
      const standardCeiling: RoomDimensions = { length: 5, width: 4, height: 2.44, unit: "meters" };
      const highCeiling: RoomDimensions = { length: 5, width: 4, height: 3.66, unit: "meters" };

      const stdGeom = normalizeRoomGeometry(standardCeiling);
      const highGeom = normalizeRoomGeometry(highCeiling);

      expect(stdGeom.areaSqM).toBe(highGeom.areaSqM);
      // Volume scales exactly with height (3.66 / 2.44 = 1.5x)
      expect(highGeom.volumeCuM).toBeCloseTo(stdGeom.volumeCuM * 1.5, 1);
    });

    it("documents exact mathematical unit conversions", () => {
      expect(FEET_PER_METER).toBeCloseTo(3.28084, 4);
      expect(CUFT_PER_CUM).toBeCloseTo(35.3147, 2);
      expect(M3H_PER_CFM).toBeCloseTo(1.69901, 3);
    });
  });

  describe("CADR Requirements & EPA 2/3 Rule", () => {
    it("calculates required CADR for 5.0 Air Changes per Hour (ACH)", () => {
      const volumeCuM = 30.0;
      const target = calculateRequiredCadr(volumeCuM, TARGET_ACH);

      // CADR (m³/h) = 30 * 5 = 150 m³/h
      expect(target.cadrM3h).toBe(150);
      // CADR (CFM) = 150 / 1.699011 ~= 88 CFM
      expect(target.cadrCfm).toBe(88);
    });

    it("evaluates EPA 2/3 Rule CADR in CFM for standard 8ft ceilings", () => {
      const areaSqFt = 150;
      const epaCfm = calculateEpaTwoThirdsCadr(areaSqFt);
      // 2/3 of 150 = 100 CFM
      expect(epaCfm).toBe(100);
    });
  });

  describe("Existing Purifier Capacity Evaluation & Gas Hazard Disclosures", () => {
    it("reports 'none' when user does not own a purifier", () => {
      const specs: ExistingPurifierSpecs = {
        hasPurifier: false,
        knownCadrM3h: null,
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: null,
      };

      const evalResult = evaluateExistingPurifier(specs, 30.0);
      expect(evalResult.status).toBe("none");
      expect(evalResult.achDelivered).toBeNull();
    });

    it("reports 'adequate' when existing purifier delivers >= 4.5 ACH, explicitly noting gas/CO limitations", () => {
      const specs: ExistingPurifierSpecs = {
        hasPurifier: true,
        knownCadrM3h: 200, // 200 / 30m³ = 6.67 ACH
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: 30,
      };

      const evalResult = evaluateExistingPurifier(specs, 30.0);
      expect(evalResult.status).toBe("adequate");
      expect(evalResult.achDelivered).toBeGreaterThanOrEqual(4.5);
      expect(evalResult.assessment).toContain("delivers ~6.7 ACH at maximum fan speed");
      expect(evalResult.assessment).toContain("does not remove carbon monoxide");
    });

    it("reports 'marginal' when existing purifier delivers between 3.0 and 4.4 ACH", () => {
      const specs: ExistingPurifierSpecs = {
        hasPurifier: true,
        knownCadrM3h: 105, // 105 / 30m³ = 3.5 ACH
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: 20,
      };

      const evalResult = evaluateExistingPurifier(specs, 30.0);
      expect(evalResult.status).toBe("marginal");
      expect(evalResult.achDelivered).toBe(3.5);
    });

    it("reports 'undersized' when existing purifier delivers < 3.0 ACH", () => {
      const specs: ExistingPurifierSpecs = {
        hasPurifier: true,
        knownCadrM3h: 60, // 60 / 30m³ = 2.0 ACH
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: 15,
      };

      const evalResult = evaluateExistingPurifier(specs, 30.0);
      expect(evalResult.status).toBe("undersized");
      expect(evalResult.achDelivered).toBe(2.0);
    });
  });

  describe("Power & Operating Cost Calculations", () => {
    it("accurately estimates power scaling and total cost of ownership", () => {
      const cadr = 250; // m³/h
      const estimatedPower = estimatePurifierPowerWatts(cadr);
      // 10 + 250 * 0.08 = 30W
      expect(estimatedPower).toBe(30);

      const costs: CostParameters = {
        electricityTariffPerKwh: 8.0, // ₹8/kWh
        annualFilterReplacementCost: 2500, // ₹2,500
        currency: "INR",
      };

      // 30W * 10 hours/day = 300 Wh/day = 0.3 kWh/day
      // 0.3 * 365 = 109.5 kWh/year
      // 109.5 * 8 = ₹876 electricity
      // Total = 876 + 2500 = ₹3,376/year
      const breakdown = calculateOperatingCosts(estimatedPower, 10, costs);
      expect(breakdown.dailyKwh).toBe(0.3);
      expect(breakdown.annualKwh).toBe(109.5);
      expect(breakdown.annualElectricityCost).toBe(876);
      expect(breakdown.annualFilterCost).toBe(2500);
      expect(breakdown.totalAnnualCost).toBe(3376);
      expect(breakdown.monthlyCost).toBe(Math.round(3376 / 12));
    });

    it("handles zero daily hours or zero electricity tariff safely without NaN or negative values", () => {
      const costs: CostParameters = {
        electricityTariffPerKwh: 0,
        annualFilterReplacementCost: 1500,
        currency: "INR",
      };

      const breakdown = calculateOperatingCosts(30, 0, costs);
      expect(breakdown.dailyKwh).toBe(0);
      expect(breakdown.annualKwh).toBe(0);
      expect(breakdown.annualElectricityCost).toBe(0);
      expect(breakdown.totalAnnualCost).toBe(1500);
    });
  });

  describe("Master Purifier Advisor Engine & Zero-Cost Pathways", () => {
    const defaultCosts: CostParameters = {
      electricityTariffPerKwh: 8.0,
      annualFilterReplacementCost: 2000,
      currency: "INR",
    };

    it("does NOT recommend purchasing a new purifier if existing unit is adequate", () => {
      const dims: RoomDimensions = { length: 4, width: 3, height: 2.5, unit: "meters" }; // 30m³
      const existing: ExistingPurifierSpecs = {
        hasPurifier: true,
        knownCadrM3h: 220, // 220 / 30 = 7.3 ACH
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: null,
      };

      const result = computePurifierAdvisor(dims, existing, defaultCosts, 120, "limited");
      expect(result.isNewPurifierPurchaseRecommended).toBe(false);
      expect(result.zeroCostAlternativeAvailable).toBe(true);
      expect(result.recommendationReason).toContain("is adequately sized");
    });

    it("does NOT recommend purchasing a purifier if user selects zero-cost budget preference", () => {
      const dims: RoomDimensions = { length: 4, width: 3, height: 2.5, unit: "meters" };
      const noPurifier: ExistingPurifierSpecs = {
        hasPurifier: false,
        knownCadrM3h: null,
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: null,
      };

      const result = computePurifierAdvisor(dims, noPurifier, defaultCosts, 140, "no_cost");
      expect(result.isNewPurifierPurchaseRecommended).toBe(false);
      expect(result.zeroCostAlternativeAvailable).toBe(true);
      expect(result.recommendationReason).toContain("zero-cost budget preference");
      expect(result.recommendationReason).toContain("purchase is not recommended");
    });

    it("does NOT recommend purchasing a purifier when outdoor air is in a favorable dispersion window (PM2.5 <= 35)", () => {
      const dims: RoomDimensions = { length: 4, width: 3, height: 2.5, unit: "meters" };
      const noPurifier: ExistingPurifierSpecs = {
        hasPurifier: false,
        knownCadrM3h: null,
        knownCadrCfm: null,
        dailyOperatingHours: 8,
        ratedWattage: null,
      };

      const result = computePurifierAdvisor(dims, noPurifier, defaultCosts, 22, "flexible");
      expect(result.isNewPurifierPurchaseRecommended).toBe(false);
      expect(result.recommendationReason).toContain("relatively lower dispersion window");
    });

    it("recommends a properly sized HEPA purifier when outdoor air is polluted and no purifier exists", () => {
      const dims: RoomDimensions = { length: 5, width: 4, height: 2.8, unit: "meters" }; // 56m³
      const noPurifier: ExistingPurifierSpecs = {
        hasPurifier: false,
        knownCadrM3h: null,
        knownCadrCfm: null,
        dailyOperatingHours: 12,
        ratedWattage: null,
      };

      const result = computePurifierAdvisor(dims, noPurifier, defaultCosts, 160, "flexible");
      expect(result.isNewPurifierPurchaseRecommended).toBe(true);
      // 56 * 5 = 280 m³/h CADR
      expect(result.recommendedCadrM3h).toBe(280);
      expect(result.recommendationReason).toContain("280 m³/h CADR");
    });
  });
});
