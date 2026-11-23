/**
 * AERIS — Environmental Telemetry Data Contracts
 * Strict TypeScript models with zero `any`.
 */

export type DataKind = "measured" | "modeled/forecast" | "simulated" | "user-reported";

export type DataFreshness = "fresh" | "stale" | "outdated";

export type AqiStandard = "US_EPA" | "EU_EAQI" | "IN_CPCB";

export type CpcbAqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export interface PollutantMeasurement {
  readonly code: "pm2_5" | "pm10" | "o3" | "no2" | "so2" | "co" | "dust";
  readonly name: string;
  /** Current 1-hour instantaneous modeled concentration */
  readonly value: number | null;
  readonly unit: "µg/m³" | "mg/m³" | "ppb" | "ppm";
  /** Averaging period classification (e.g. 1-hour modeled, 24-hour rolling, 8-hour rolling) */
  readonly averagingPeriod: string;
  /** Rolling average value used for CPCB AQI calculation */
  readonly rollingAverageValue?: number | null;
  readonly rollingAverageUnit?: "µg/m³" | "mg/m³";
  readonly completenessHours?: number;
  readonly requiredHours?: number;
  readonly who24hGuideline?: number;
  readonly status: "available" | "unavailable";
}

export interface AqiDetail {
  readonly standard: AqiStandard;
  readonly name: string;
  readonly value: number | null;
  readonly category: string;
  readonly dominantPollutant?: string;
  readonly scaleMin: number;
  readonly scaleMax: number;
  readonly colorClass: string;
  readonly methodology: "model-derived-cpcb-method" | "modeled-forecast" | "official-station";
  readonly calculationBasis?: string;
  readonly unavailabilityReason?: string;
  readonly subIndices?: Readonly<Record<string, number>>;
}

export interface WeatherCondition {
  readonly temperatureC: number;
  readonly apparentTemperatureC: number;
  readonly relativeHumidityPercent: number;
  readonly windSpeedKmH: number;
  readonly windDirectionDegrees: number;
  readonly surfacePressureHPa: number;
  readonly weatherCode: number;
  readonly weatherLabel: string;
}

export interface HourlyForecastPoint {
  readonly time: string; // ISO 8601 string
  readonly pm2_5: number | null;
  readonly pm10: number | null;
  readonly usAqi: number | null;
  readonly temperatureC: number | null;
  readonly humidityPercent: number | null;
  readonly windSpeedKmH: number | null;
}

export interface LocationMetadata {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly elevationMeters?: number;
  readonly timezone: string;
  readonly modelDomain?: string;
}

export interface NormalizedTelemetry {
  readonly location: LocationMetadata;
  readonly source: string;
  readonly dataKind: DataKind;
  /** Forecast validity timestamp (model observation time) in ISO 8601 */
  readonly timestamp: string;
  /** Retrieval timestamp (when AERIS server requested the provider) in ISO 8601 */
  readonly retrievedAt: string;
  readonly freshness: DataFreshness;
  readonly freshnessExplanation: string;
  readonly weather: WeatherCondition;
  readonly aqi: {
    readonly usAqi: AqiDetail;
    readonly europeanAqi: AqiDetail;
    readonly cpcbAqi: AqiDetail;
  };
  readonly pollutants: readonly PollutantMeasurement[];
  readonly hourlyForecast: readonly HourlyForecastPoint[];
  readonly disclaimer: string;
}
