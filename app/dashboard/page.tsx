"use client";

import React, { useState, useEffect } from "react";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import type { LocationMetadata, NormalizedTelemetry } from "@/lib/telemetry/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AqiOverviewCard } from "@/components/dashboard/aqi-overview-card";
import { PollutantGrid } from "@/components/dashboard/pollutant-grid";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { DataAttributionBanner } from "@/components/dashboard/data-attribution-banner";
import { useTheme } from "@/components/theme/theme-provider";
import {
  TelemetryLoadingState,
  TelemetryErrorState,
  StaleDataWarning,
} from "@/components/dashboard/telemetry-state-views";

export default function DashboardPage(): React.JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<LocationMetadata>(DEFAULT_LOCATION);
  const [telemetry, setTelemetry] = useState<NormalizedTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Fetch telemetry when location changes
  useEffect(() => {
    let canceled = false;

    async function fetchTelemetry() {
      try {
        const res = await fetch(
          `/api/telemetry?locationId=${encodeURIComponent(selectedLocation.id)}`
        );
        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(
            errorJson.error || `HTTP ${res.status}: Failed to retrieve telemetry`
          );
        }

        const data: NormalizedTelemetry = await res.json();
        if (!canceled) {
          setTelemetry(data);
          setError(null);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      } catch (err: unknown) {
        if (!canceled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Network error connecting to telemetry service";
          setError({ message: msg });
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchTelemetry();

    return () => {
      canceled = true;
    };
  }, [selectedLocation]);

  const handleLocationChange = (nextLocation: LocationMetadata): void => {
    setIsLoading(true);
    setError(null);
    setSelectedLocation(nextLocation);
  };

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/telemetry?locationId=${encodeURIComponent(selectedLocation.id)}`
      );
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(
          errorJson.error || `HTTP ${res.status}: Failed to retrieve telemetry`
        );
      }
      const data: NormalizedTelemetry = await res.json();
      setTelemetry(data);
      setError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Network error connecting to telemetry service";
      setError({ message: msg });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <DashboardHeader
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        freshness={telemetry?.freshness ?? "fresh"}
        lastUpdated={telemetry?.timestamp ?? ""}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-6 py-8 focus:outline-none">
        {isLoading && !telemetry ? (
          <TelemetryLoadingState message={`Retrieving live atmospheric model readings for ${selectedLocation.name}...`} />
        ) : error && !telemetry ? (
          <TelemetryErrorState
            errorMessage={error.message}
            errorDetails={error.details}
            onRetry={handleRefresh}
          />
        ) : telemetry ? (
          <>
            {telemetry.freshness !== "fresh" && (
              <StaleDataWarning lastUpdated={telemetry.timestamp} />
            )}

            {/* AQI Overview: Indian CPCB + US EPA + European EAQI */}
            <AqiOverviewCard
              usAqi={telemetry.aqi.usAqi}
              cpcbAqi={telemetry.aqi.cpcbAqi}
              europeanAqi={telemetry.aqi.europeanAqi}
            />

            {/* Pollutants Grid with µg/m³ units and WHO comparisons */}
            <PollutantGrid pollutants={telemetry.pollutants} />

            {/* Meteorological Context Widget */}
            <WeatherWidget weather={telemetry.weather} />

            {/* 24-Hour Forecast Trajectory Chart */}
            <ForecastChart hourly={telemetry.hourlyForecast} />

            {/* Transparency, Data Kind & Source Attribution */}
            <DataAttributionBanner telemetry={telemetry} />
          </>
        ) : null}
      </main>
    </div>
  );
}
