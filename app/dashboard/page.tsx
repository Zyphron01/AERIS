"use client";

import React, { useState } from "react";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import { useTelemetry } from "@/lib/telemetry/use-telemetry";
import type { LocationMetadata } from "@/lib/telemetry/types";
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
  const { telemetry, isLoading, isRefreshing, error, refetch } = useTelemetry(selectedLocation.id);
  const { theme, toggleTheme } = useTheme();

  const handleLocationChange = (nextLocation: LocationMetadata): void => {
    setSelectedLocation(nextLocation);
  };

  const handleRefresh = async (): Promise<void> => {
    await refetch();
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
            errorMessage={error}
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
