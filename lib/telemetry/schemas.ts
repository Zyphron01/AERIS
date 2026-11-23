/**
 * AERIS — Zod Schemas for Open-Meteo APIs
 * Strict runtime validation rejecting malformed or out-of-range payloads.
 */

import { z } from "zod";

export const OpenMeteoWeatherResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number().optional(),
  utc_offset_seconds: z.number().optional(),
  timezone: z.string().optional(),
  elevation: z.number().optional(),
  current_units: z.record(z.string(), z.string()).optional(),
  current: z.object({
    time: z.string().min(1),
    interval: z.number().optional(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number().optional(),
    weather_code: z.number().optional(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number().optional(),
    surface_pressure: z.number().optional(),
  }),
  hourly_units: z.record(z.string(), z.string()).optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: z.array(z.number().nullable()).optional(),
      relative_humidity_2m: z.array(z.number().nullable()).optional(),
      wind_speed_10m: z.array(z.number().nullable()).optional(),
      weather_code: z.array(z.number().nullable()).optional(),
    })
    .optional(),
});

export const OpenMeteoAirQualityResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number().optional(),
  utc_offset_seconds: z.number().optional(),
  timezone: z.string().optional(),
  elevation: z.number().optional(),
  current_units: z.record(z.string(), z.string()).optional(),
  current: z.object({
    time: z.string().min(1),
    interval: z.number().optional(),
    european_aqi: z.number().nullable().optional(),
    us_aqi: z.number().nullable().optional(),
    pm10: z.number().nullable().optional(),
    pm2_5: z.number().nullable().optional(),
    carbon_monoxide: z.number().nullable().optional(),
    nitrogen_dioxide: z.number().nullable().optional(),
    sulphur_dioxide: z.number().nullable().optional(),
    ozone: z.number().nullable().optional(),
    dust: z.number().nullable().optional(),
  }),
  hourly_units: z.record(z.string(), z.string()).optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      pm10: z.array(z.number().nullable()).optional(),
      pm2_5: z.array(z.number().nullable()).optional(),
      carbon_monoxide: z.array(z.number().nullable()).optional(),
      nitrogen_dioxide: z.array(z.number().nullable()).optional(),
      sulphur_dioxide: z.array(z.number().nullable()).optional(),
      ozone: z.array(z.number().nullable()).optional(),
      dust: z.array(z.number().nullable()).optional(),
      us_aqi: z.array(z.number().nullable()).optional(),
      european_aqi: z.array(z.number().nullable()).optional(),
    })
    .optional(),
});

export type RawOpenMeteoWeather = z.infer<typeof OpenMeteoWeatherResponseSchema>;
export type RawOpenMeteoAirQuality = z.infer<typeof OpenMeteoAirQualityResponseSchema>;
