/**
 * AERIS What-If Scenario Simulator — Zod Validation Schemas
 * Enforces strict runtime validation for all scenario parameters per AERIS Rule 4.
 */

import { z } from "zod";

export const OutdoorTimingInputSchema = z.object({
  scenarioType: z.literal("outdoor_timing"),
  baselineHourIso: z.string().min(1, "Baseline hour is required"),
  alternativeHourIso: z.string().min(1, "Alternative hour is required"),
  activityType: z.enum(["exercise", "commute", "errands", "leisure"]).default("exercise"),
});

export const IndoorVsOutdoorInputSchema = z.object({
  scenarioType: z.literal("indoor_vs_outdoor"),
  forecastHourIso: z.string().min(1, "Forecast hour is required"),
  indoorFiltrationActive: z.boolean().default(false),
  roomVentilationState: z.enum(["sealed_windows", "open_windows"]).default("sealed_windows"),
});

export const CommuteModeInputSchema = z.object({
  scenarioType: z.literal("commute_mode"),
  forecastHourIso: z.string().min(1, "Forecast hour is required"),
  baselineMode: z.enum([
    "active_walking_biking",
    "open_two_wheeler_auto",
    "closed_public_transit_metro",
    "private_car_ac",
  ]),
  alternativeMode: z.enum([
    "active_walking_biking",
    "open_two_wheeler_auto",
    "closed_public_transit_metro",
    "private_car_ac",
  ]),
});

export const FiltrationHypotheticalInputSchema = z.object({
  scenarioType: z.literal("filtration_hypothetical"),
  roomVolumeCuM: z.number().positive("Room volume must be positive").max(500, "Max room volume is 500 m³").default(30),
  ratedCadrM3h: z.number().positive("CADR must be positive").max(2000, "Max CADR is 2000 m³/h").default(250),
  fanSpeedMode: z.enum(["maximum_certified", "low_quiet_unverified"]).default("maximum_certified"),
});

export const ScenarioInputSchema = z.discriminatedUnion("scenarioType", [
  OutdoorTimingInputSchema,
  IndoorVsOutdoorInputSchema,
  CommuteModeInputSchema,
  FiltrationHypotheticalInputSchema,
]);

export type OutdoorTimingInput = z.infer<typeof OutdoorTimingInputSchema>;
export type IndoorVsOutdoorInput = z.infer<typeof IndoorVsOutdoorInputSchema>;
export type CommuteModeInput = z.infer<typeof CommuteModeInputSchema>;
export type FiltrationHypotheticalInput = z.infer<typeof FiltrationHypotheticalInputSchema>;
export type ScenarioInput = z.infer<typeof ScenarioInputSchema>;
