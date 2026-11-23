import { z } from "zod";

export const RoomDimensionsSchema = z.object({
  length: z.number().positive("Length must be a positive number").max(100, "Length exceeds practical room size"),
  width: z.number().positive("Width must be a positive number").max(100, "Width exceeds practical room size"),
  height: z.number().positive("Height must be a positive number").max(20, "Height exceeds practical room ceiling"),
  unit: z.enum(["meters", "feet"]),
});

export const ExistingPurifierSpecsSchema = z.object({
  hasPurifier: z.boolean(),
  knownCadrM3h: z.number().positive().nullable(),
  knownCadrCfm: z.number().positive().nullable(),
  dailyOperatingHours: z.number().min(0).max(24),
  ratedWattage: z.number().positive().nullable(),
});

export const CostParametersSchema = z.object({
  electricityTariffPerKwh: z.number().nonnegative("Tariff cannot be negative"),
  annualFilterReplacementCost: z.number().nonnegative("Filter cost cannot be negative"),
  currency: z.enum(["INR", "USD"]),
});

export const UserReportedIndoorConditionsSchema = z.object({
  roomType: z.enum(["bedroom", "living_room", "kitchen", "home_office", "nursery"]),
  windowState: z.enum(["all_closed", "cracked_open", "wide_open"]),
  combustionSources: z.array(
    z.enum(["cooking_unvented", "gas_stove", "incense_candles", "smoking", "none"])
  ),
  dustActivities: z.array(z.enum(["sweeping", "vacuuming", "renovation", "none"])),
  occupancyCount: z.number().int().min(1).max(50),
  perceivedStuffiness: z.enum(["fresh", "normal", "stuffy_drowsy", "odorous"]),
  hasExhaustFanRunning: z.boolean(),
  hasAirConditionerRunning: z.boolean(),
  thermalComfort: z.enum(["comfortable", "too_hot", "too_cold"]),
});

export const OptionalIndoorSensorsSchema = z.object({
  pm25Value: z.number().nonnegative().nullable(),
  co2Ppm: z.number().int().positive().nullable(),
  temperatureC: z.number().nullable(),
  humidityPercent: z.number().min(0).max(100).nullable(),
  deviceLabel: z.string().optional(),
});
