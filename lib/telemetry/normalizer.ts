/**
 * AERIS — Telemetry Data Normalizer
 * Bridges raw provider responses to normalized, strictly typed, scientifically attributed domain entities.
 */

import type {
  NormalizedTelemetry,
  PollutantMeasurement,
  LocationMetadata,
  DataFreshness,
  WeatherCondition,
  HourlyForecastPoint,
} from "./types";
import type { RawOpenMeteoWeather, RawOpenMeteoAirQuality } from "./schemas";
import {
  calculateOverallCpcbAqi,
  getCpcbColorClass,
  computeRollingAverage,
  convertUgM3ToMgM3,
} from "@/lib/aqi/cpcb-aqi";

function decodeWmoWeatherCode(code?: number): string {
  switch (code) {
    case 0:
      return "Clear Sky";
    case 1:
      return "Mainly Clear";
    case 2:
      return "Partly Cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Foggy";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 71:
    case 73:
    case 75:
      return "Snowfall";
    case 80:
    case 81:
    case 82:
      return "Rain Showers";
    case 95:
    case 96:
    case 99:
      return "Thunderstorm";
    default:
      return "Fair / Moderate";
  }
}

export function getUsAqiCategory(aqi: number): { category: string; colorClass: string } {
  if (aqi <= 50) {
    return {
      category: "Good",
      colorClass:
        "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800",
    };
  }
  if (aqi <= 100) {
    return {
      category: "Moderate",
      colorClass:
        "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800",
    };
  }
  if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      colorClass:
        "text-orange-700 bg-orange-50 border-orange-300 dark:text-orange-300 dark:bg-orange-950/50 dark:border-orange-800",
    };
  }
  if (aqi <= 200) {
    return {
      category: "Unhealthy",
      colorClass:
        "text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800",
    };
  }
  if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      colorClass:
        "text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-950/50 dark:border-purple-800",
    };
  }
  return {
    category: "Hazardous",
    colorClass:
      "text-red-900 bg-red-100 border-red-400 dark:text-red-300 dark:bg-red-950/70 dark:border-red-800",
  };
}

function getEuropeanAqiCategory(eaqi: number): { level: number; category: string; colorClass: string } {
  let level = eaqi;
  if (eaqi > 6) {
    if (eaqi <= 20) level = 1;
    else if (eaqi <= 40) level = 2;
    else if (eaqi <= 60) level = 3;
    else if (eaqi <= 80) level = 4;
    else if (eaqi <= 100) level = 5;
    else level = 6;
  }
  level = Math.max(1, Math.min(6, Math.round(level)));

  switch (level) {
    case 1:
      return {
        level: 1,
        category: "Good",
        colorClass: "text-emerald-700 bg-emerald-50 border-emerald-300",
      };
    case 2:
      return {
        level: 2,
        category: "Fair",
        colorClass: "text-teal-700 bg-teal-50 border-teal-300",
      };
    case 3:
      return {
        level: 3,
        category: "Moderate",
        colorClass: "text-amber-700 bg-amber-50 border-amber-300",
      };
    case 4:
      return {
        level: 4,
        category: "Poor",
        colorClass: "text-orange-700 bg-orange-50 border-orange-300",
      };
    case 5:
      return {
        level: 5,
        category: "Very Poor",
        colorClass: "text-rose-700 bg-rose-50 border-rose-300",
      };
    case 6:
    default:
      return {
        level: 6,
        category: "Extremely Poor",
        colorClass: "text-red-900 bg-red-100 border-red-400",
      };
  }
}

export function normalizeTelemetry(
  location: LocationMetadata,
  weatherRaw: RawOpenMeteoWeather,
  airQualityRaw: RawOpenMeteoAirQuality,
  retrievedAtDate = new Date()
): NormalizedTelemetry {
  const weatherTime = weatherRaw.current.time;
  const weatherReading: WeatherCondition = {
    temperatureC: Math.round(weatherRaw.current.temperature_2m * 10) / 10,
    apparentTemperatureC:
      Math.round((weatherRaw.current.apparent_temperature ?? weatherRaw.current.temperature_2m) * 10) /
      10,
    relativeHumidityPercent: Math.round(weatherRaw.current.relative_humidity_2m),
    windSpeedKmH: Math.round(weatherRaw.current.wind_speed_10m * 10) / 10,
    windDirectionDegrees: Math.round(weatherRaw.current.wind_direction_10m ?? 0),
    surfacePressureHPa: Math.round(weatherRaw.current.surface_pressure ?? 1013),
    weatherCode: weatherRaw.current.weather_code ?? 0,
    weatherLabel: decodeWmoWeatherCode(weatherRaw.current.weather_code),
  };

  const aqCurrent = airQualityRaw.current;
  const validityTimestamp = aqCurrent.time || weatherTime;

  // 1. Align weather and air-quality hourly records by matching ISO timestamp strings
  const weatherHourlyMap = new Map<
    string,
    { temperature: number | null; humidity: number | null; windSpeed: number | null }
  >();

  if (weatherRaw.hourly?.time) {
    for (let i = 0; i < weatherRaw.hourly.time.length; i++) {
      const t = weatherRaw.hourly.time[i];
      weatherHourlyMap.set(t, {
        temperature: weatherRaw.hourly.temperature_2m?.[i] ?? null,
        humidity: weatherRaw.hourly.relative_humidity_2m?.[i] ?? null,
        windSpeed: weatherRaw.hourly.wind_speed_10m?.[i] ?? null,
      });
    }
  }

  // 2. Extract historical values up to the current observation hour for CPCB rolling windows
  const aqHourlyTimes = airQualityRaw.hourly?.time ?? [];
  let currentHourIndex = -1;

  for (let i = 0; i < aqHourlyTimes.length; i++) {
    if (aqHourlyTimes[i] === validityTimestamp) {
      currentHourIndex = i;
      break;
    }
  }

  // If exact match not found, take the point closest to or preceding the validityTimestamp
  if (currentHourIndex === -1 && aqHourlyTimes.length > 0) {
    const valTimeMs = new Date(validityTimestamp).getTime();
    for (let i = aqHourlyTimes.length - 1; i >= 0; i--) {
      if (new Date(aqHourlyTimes[i]).getTime() <= valTimeMs) {
        currentHourIndex = i;
        break;
      }
    }
    if (currentHourIndex === -1) {
      currentHourIndex = 0;
    }
  }

  // Extract slices ending at currentHourIndex (inclusive)
  const historyEndIdx = currentHourIndex >= 0 ? currentHourIndex + 1 : 0;
  const pm25HourlyHistory = airQualityRaw.hourly?.pm2_5?.slice(0, historyEndIdx) ?? [];
  const pm10HourlyHistory = airQualityRaw.hourly?.pm10?.slice(0, historyEndIdx) ?? [];
  const no2HourlyHistory = airQualityRaw.hourly?.nitrogen_dioxide?.slice(0, historyEndIdx) ?? [];
  const so2HourlyHistory = airQualityRaw.hourly?.sulphur_dioxide?.slice(0, historyEndIdx) ?? [];
  const o3HourlyHistory = airQualityRaw.hourly?.ozone?.slice(0, historyEndIdx) ?? [];
  const coHourlyHistory = airQualityRaw.hourly?.carbon_monoxide?.slice(0, historyEndIdx) ?? [];

  // 3. Compute CPCB 24-hr and 8-hr rolling averages
  // 24-hr rolling averages for particulates and acid gases (min 16 hours required)
  const pm25Rolling = computeRollingAverage(pm25HourlyHistory, 24, 16);
  const pm10Rolling = computeRollingAverage(pm10HourlyHistory, 24, 16);
  const no2Rolling = computeRollingAverage(no2HourlyHistory, 24, 16);
  const so2Rolling = computeRollingAverage(so2HourlyHistory, 24, 16);

  // 8-hr rolling averages for CO and O3 (min 6 hours required)
  const o3Rolling = computeRollingAverage(o3HourlyHistory, 8, 6);

  // Convert CO from µg/m³ to mg/m³ for CPCB calculations
  const coHourlyHistoryMg = coHourlyHistory.map((v) =>
    v !== null && v !== undefined ? convertUgM3ToMgM3(v) : null
  );
  const coRollingMg = computeRollingAverage(coHourlyHistoryMg, 8, 6);

  // Fallback to instantaneous concentration ONLY if hourly history is entirely missing,
  // but explicitly indicate incomplete history
  const hasHourlyData = aqHourlyTimes.length > 0;

  const cpcbAveragedPollutants: Partial<Record<string, number | null>> = {
    pm2_5: pm25Rolling.isSufficient ? pm25Rolling.average : hasHourlyData ? null : aqCurrent.pm2_5,
    pm10: pm10Rolling.isSufficient ? pm10Rolling.average : hasHourlyData ? null : aqCurrent.pm10,
    no2: no2Rolling.isSufficient ? no2Rolling.average : hasHourlyData ? null : aqCurrent.nitrogen_dioxide,
    so2: so2Rolling.isSufficient ? so2Rolling.average : hasHourlyData ? null : aqCurrent.sulphur_dioxide,
    o3: o3Rolling.isSufficient ? o3Rolling.average : hasHourlyData ? null : aqCurrent.ozone,
    co: coRollingMg.isSufficient
      ? coRollingMg.average
      : hasHourlyData
      ? null
      : aqCurrent.carbon_monoxide !== null && aqCurrent.carbon_monoxide !== undefined
      ? convertUgM3ToMgM3(aqCurrent.carbon_monoxide)
      : null,
  };

  // 4. Calculate Indian National AQI strictly adhering to CPCB (2014) rules
  const cpcbResult = calculateOverallCpcbAqi(cpcbAveragedPollutants);
  const cpcbColor =
    cpcbResult.category !== "Unavailable"
      ? getCpcbColorClass(cpcbResult.category)
      : "text-slate-500 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700";

  // 5. Structure Individual Pollutant Measurements
  const pollutants: PollutantMeasurement[] = [
    {
      code: "pm2_5",
      name: "Particulate Matter PM2.5",
      value: aqCurrent.pm2_5 !== null && aqCurrent.pm2_5 !== undefined ? Math.round(aqCurrent.pm2_5 * 10) / 10 : null,
      unit: "µg/m³",
      averagingPeriod: "24-hr rolling (CPCB standard)",
      rollingAverageValue: pm25Rolling.average,
      rollingAverageUnit: "µg/m³",
      completenessHours: pm25Rolling.validCount,
      requiredHours: 16,
      who24hGuideline: 15,
      status: aqCurrent.pm2_5 !== null && aqCurrent.pm2_5 !== undefined ? "available" : "unavailable",
    },
    {
      code: "pm10",
      name: "Particulate Matter PM10",
      value: aqCurrent.pm10 !== null && aqCurrent.pm10 !== undefined ? Math.round(aqCurrent.pm10 * 10) / 10 : null,
      unit: "µg/m³",
      averagingPeriod: "24-hr rolling (CPCB standard)",
      rollingAverageValue: pm10Rolling.average,
      rollingAverageUnit: "µg/m³",
      completenessHours: pm10Rolling.validCount,
      requiredHours: 16,
      who24hGuideline: 45,
      status: aqCurrent.pm10 !== null && aqCurrent.pm10 !== undefined ? "available" : "unavailable",
    },
    {
      code: "o3",
      name: "Tropospheric Ozone (O₃)",
      value: aqCurrent.ozone !== null && aqCurrent.ozone !== undefined ? Math.round(aqCurrent.ozone * 10) / 10 : null,
      unit: "µg/m³",
      averagingPeriod: "8-hr rolling (CPCB standard)",
      rollingAverageValue: o3Rolling.average,
      rollingAverageUnit: "µg/m³",
      completenessHours: o3Rolling.validCount,
      requiredHours: 6,
      who24hGuideline: 100,
      status: aqCurrent.ozone !== null && aqCurrent.ozone !== undefined ? "available" : "unavailable",
    },
    {
      code: "no2",
      name: "Nitrogen Dioxide (NO₂)",
      value:
        aqCurrent.nitrogen_dioxide !== null && aqCurrent.nitrogen_dioxide !== undefined
          ? Math.round(aqCurrent.nitrogen_dioxide * 10) / 10
          : null,
      unit: "µg/m³",
      averagingPeriod: "24-hr rolling (CPCB standard)",
      rollingAverageValue: no2Rolling.average,
      rollingAverageUnit: "µg/m³",
      completenessHours: no2Rolling.validCount,
      requiredHours: 16,
      who24hGuideline: 25,
      status:
        aqCurrent.nitrogen_dioxide !== null && aqCurrent.nitrogen_dioxide !== undefined
          ? "available"
          : "unavailable",
    },
    {
      code: "so2",
      name: "Sulphur Dioxide (SO₂)",
      value:
        aqCurrent.sulphur_dioxide !== null && aqCurrent.sulphur_dioxide !== undefined
          ? Math.round(aqCurrent.sulphur_dioxide * 10) / 10
          : null,
      unit: "µg/m³",
      averagingPeriod: "24-hr rolling (CPCB standard)",
      rollingAverageValue: so2Rolling.average,
      rollingAverageUnit: "µg/m³",
      completenessHours: so2Rolling.validCount,
      requiredHours: 16,
      who24hGuideline: 40,
      status:
        aqCurrent.sulphur_dioxide !== null && aqCurrent.sulphur_dioxide !== undefined
          ? "available"
          : "unavailable",
    },
    {
      code: "co",
      name: "Carbon Monoxide (CO)",
      value:
        aqCurrent.carbon_monoxide !== null && aqCurrent.carbon_monoxide !== undefined
          ? Math.round(aqCurrent.carbon_monoxide * 10) / 10
          : null,
      unit: "µg/m³",
      averagingPeriod: "8-hr rolling (CPCB: mg/m³)",
      rollingAverageValue: coRollingMg.average,
      rollingAverageUnit: "mg/m³",
      completenessHours: coRollingMg.validCount,
      requiredHours: 6,
      who24hGuideline: 4000,
      status:
        aqCurrent.carbon_monoxide !== null && aqCurrent.carbon_monoxide !== undefined
          ? "available"
          : "unavailable",
    },
    {
      code: "dust",
      name: "Mineral Dust",
      value: aqCurrent.dust !== null && aqCurrent.dust !== undefined ? Math.round(aqCurrent.dust * 10) / 10 : null,
      unit: "µg/m³",
      averagingPeriod: "1-hr instantaneous",
      status: aqCurrent.dust !== null && aqCurrent.dust !== undefined ? "available" : "unavailable",
    },
  ];

  // US EPA AQI
  const usAqiVal = aqCurrent.us_aqi ?? null;
  const usAqiCat =
    usAqiVal !== null
      ? getUsAqiCategory(usAqiVal)
      : { category: "Unavailable", colorClass: "text-slate-500 bg-slate-100" };

  // European EAQI
  const eAqiVal = aqCurrent.european_aqi ?? null;
  const eAqiCat =
    eAqiVal !== null
      ? getEuropeanAqiCategory(eAqiVal)
      : { level: null, category: "Unavailable", colorClass: "text-slate-500 bg-slate-100" };

  // Compute Freshness
  const dataTime = new Date(validityTimestamp);
  const diffMinutes = Math.abs((retrievedAtDate.getTime() - dataTime.getTime()) / (1000 * 60));
  let freshness: DataFreshness = "fresh";
  let freshnessExplanation = "Fresh: Observation timestamp is within 90 minutes.";

  if (diffMinutes > 180) {
    freshness = "outdated";
    freshnessExplanation = "Outdated: Observation is older than 180 minutes. Model refresh pending.";
  } else if (diffMinutes > 90) {
    freshness = "stale";
    freshnessExplanation = "Stale: Observation is between 90 and 180 minutes old.";
  }

  // 6. Build Hourly Forecast Series (Aligned by Timestamp)
  const hourlyForecast: HourlyForecastPoint[] = [];
  const startForecastIdx = currentHourIndex >= 0 ? currentHourIndex : 0;
  const forecastHorizon = Math.min(aqHourlyTimes.length, startForecastIdx + 24);

  for (let i = startForecastIdx; i < forecastHorizon; i++) {
    const t = aqHourlyTimes[i];
    const weatherData = weatherHourlyMap.get(t);

    hourlyForecast.push({
      time: t,
      pm2_5: airQualityRaw.hourly?.pm2_5?.[i] ?? null,
      pm10: airQualityRaw.hourly?.pm10?.[i] ?? null,
      usAqi: airQualityRaw.hourly?.us_aqi?.[i] ?? null,
      temperatureC: weatherData?.temperature ?? null,
      humidityPercent: weatherData?.humidity ?? null,
      windSpeedKmH: weatherData?.windSpeed ?? null,
    });
  }

  // Fallback if forecast points were empty (e.g. mock test data with no times)
  if (hourlyForecast.length === 0 && (airQualityRaw.hourly?.time || weatherRaw.hourly?.time)) {
    const fallbackTimes = airQualityRaw.hourly?.time ?? weatherRaw.hourly?.time ?? [];
    for (let i = 0; i < Math.min(fallbackTimes.length, 24); i++) {
      const t = fallbackTimes[i];
      const weatherData = weatherHourlyMap.get(t);
      hourlyForecast.push({
        time: t,
        pm2_5: airQualityRaw.hourly?.pm2_5?.[i] ?? null,
        pm10: airQualityRaw.hourly?.pm10?.[i] ?? null,
        usAqi: airQualityRaw.hourly?.us_aqi?.[i] ?? null,
        temperatureC: weatherData?.temperature ?? null,
        humidityPercent: weatherData?.humidity ?? null,
        windSpeedKmH: weatherData?.windSpeed ?? null,
      });
    }
  }

  const modelDomainName = location.modelDomain || "CAMS Global Chemical Transport Model";

  return {
    location,
    source: `Open-Meteo Air Quality & Weather API (${modelDomainName})`,
    dataKind: "modeled/forecast",
    timestamp: validityTimestamp,
    retrievedAt: retrievedAtDate.toISOString(),
    freshness,
    freshnessExplanation,
    weather: weatherReading,
    aqi: {
      usAqi: {
        standard: "US_EPA",
        name: "US EPA Air Quality Index",
        value: usAqiVal,
        category: usAqiCat.category,
        scaleMin: 0,
        scaleMax: 500,
        colorClass: usAqiCat.colorClass,
        methodology: "modeled-forecast",
        calculationBasis: "EPA NowCast / 24-hr concentration algorithm provided by Open-Meteo",
      },
      europeanAqi: {
        standard: "EU_EAQI",
        name: "European Air Quality Index",
        value: eAqiCat.level,
        category: eAqiCat.category,
        scaleMin: 1,
        scaleMax: 6,
        colorClass: eAqiCat.colorClass,
        methodology: "modeled-forecast",
        calculationBasis: "European Environment Agency (EEA) 5-pollutant maximum band index (Levels 1-6)",
      },
      cpcbAqi: {
        standard: "IN_CPCB",
        name: "CPCB Indian National AQI",
        value: cpcbResult.aqi,
        category: cpcbResult.category,
        dominantPollutant: cpcbResult.dominantPollutant,
        scaleMin: 0,
        scaleMax: 500,
        colorClass: cpcbColor,
        methodology: "model-derived-cpcb-method",
        calculationBasis:
          "CPCB (2014) formula with rolling 24-hr (PM2.5, PM10, NO2, SO2) and 8-hr (CO in mg/m³, O3) model windows",
        unavailabilityReason: cpcbResult.unavailabilityReason,
        subIndices: cpcbResult.subIndices,
      },
    },
    pollutants,
    hourlyForecast,
    disclaimer:
      "Telemetry values are sourced from Open-Meteo atmospheric chemical transport models and calibrated using official CPCB/EPA breakpoint formulas. Modeled estimates provide environmental guidance and do not replace certified physical station telemetry or official regulatory notices.",
  };
}
