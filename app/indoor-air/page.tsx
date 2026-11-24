"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore, useMemo } from "react";
import { IndoorAirHeader } from "@/components/indoor-air/indoor-air-header";
import { OutdoorVsIndoorCard } from "@/components/indoor-air/outdoor-vs-indoor-card";
import { IndoorConditionsPanel } from "@/components/indoor-air/indoor-conditions-panel";
import { PurifierAdvisorWidget } from "@/components/indoor-air/purifier-advisor-widget";
import { IndoorRecommendationsList } from "@/components/indoor-air/indoor-recommendations-list";
import { DataAttributionBanner } from "@/components/dashboard/data-attribution-banner";
import {
  TelemetryLoadingState,
  TelemetryErrorState,
  StaleDataWarning,
} from "@/components/dashboard/telemetry-state-views";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import type { LocationMetadata, NormalizedTelemetry } from "@/lib/telemetry/types";
import {
  subscribeToHouseholdProfile,
  getHouseholdProfileSnapshot,
  getHouseholdProfileServerSnapshot,
  safeParseHouseholdProfile,
} from "@/lib/decision-engine/household-profile";
import type {
  RoomDimensions,
  ExistingPurifierSpecs,
  CostParameters,
  UserReportedIndoorConditions,
  OptionalIndoorSensors,
} from "@/lib/indoor-air/types";
import { computePurifierAdvisor } from "@/lib/indoor-air/calculations";
import { generateIndoorAirPlan } from "@/lib/indoor-air/rules";
import { useTheme } from "@/components/theme/theme-provider";

export default function IndoorAirPage(): React.JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<LocationMetadata>(DEFAULT_LOCATION);
  const [telemetry, setTelemetry] = useState<NormalizedTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Read household profile from synced store
  const rawProfile = useSyncExternalStore(
    subscribeToHouseholdProfile,
    getHouseholdProfileSnapshot,
    getHouseholdProfileServerSnapshot
  );

  const profile = useMemo(() => {
    return safeParseHouseholdProfile(rawProfile);
  }, [rawProfile]);

  // Initial user-reported conditions
  const [conditions, setConditions] = useState<UserReportedIndoorConditions>({
    roomType: "bedroom",
    windowState: "all_closed",
    combustionSources: ["none"],
    dustActivities: ["none"],
    occupancyCount: 2,
    perceivedStuffiness: "normal",
    hasExhaustFanRunning: false,
    hasAirConditionerRunning: false,
    thermalComfort: "comfortable",
  });

  // Physical in-room sensor observations (optional)
  const [sensors, setSensors] = useState<OptionalIndoorSensors>({
    pm25Value: null,
    co2Ppm: null,
    temperatureC: null,
    humidityPercent: null,
  });

  // Purifier room sizing baseline
  const [dimensions] = useState<RoomDimensions>({
    length: 4.0,
    width: 3.5,
    height: 2.8,
    unit: "meters",
  });

  // Existing purifier specs derived from profile
  const existingPurifier: ExistingPurifierSpecs = useMemo(() => ({
    hasPurifier: profile?.filtration === "hepa_purifier",
    knownCadrM3h: 260,
    knownCadrCfm: 153,
    dailyOperatingHours: 12,
    ratedWattage: 38,
  }), [profile?.filtration]);

  // Cost and energy parameters
  const [costParams] = useState<CostParameters>({
    electricityTariffPerKwh: 8.0,
    annualFilterReplacementCost: 2500,
    currency: "INR",
  });

  // Telemetry fetcher
  const loadTelemetry = useCallback(async (location: LocationMetadata) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/telemetry?locationId=${location.id}`);
      if (!res.ok) {
        throw new Error(`Telemetry service returned status ${res.status}`);
      }
      const data: NormalizedTelemetry = await res.json();
      setTelemetry(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load live air quality telemetry";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    async function fetchInitial() {
      try {
        const res = await fetch(`/api/telemetry?locationId=${selectedLocation.id}`);
        if (!res.ok) {
          throw new Error(`Telemetry service returned status ${res.status}`);
        }
        const data: NormalizedTelemetry = await res.json();
        if (!canceled) {
          setTelemetry(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!canceled) {
          const msg = err instanceof Error ? err.message : "Failed to load live air quality telemetry";
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    void fetchInitial();
    return () => {
      canceled = true;
    };
  }, [selectedLocation.id]);

  const handleLocationChange = useCallback(
    (loc: LocationMetadata) => {
      setSelectedLocation(loc);
      void loadTelemetry(loc);
    },
    [loadTelemetry]
  );

  const outdoorPm25 = useMemo(() => {
    if (!telemetry) return null;
    return telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  }, [telemetry]);

  // Pure deterministic calculations
  const purifierAdvisor = useMemo(() => {
    return computePurifierAdvisor(
      dimensions,
      existingPurifier,
      costParams,
      outdoorPm25,
      profile?.budgetPreference ?? "limited"
    );
  }, [dimensions, existingPurifier, costParams, outdoorPm25, profile?.budgetPreference]);

  const indoorPlan = useMemo(() => {
    if (!telemetry) return null;
    return generateIndoorAirPlan(
      telemetry,
      conditions,
      sensors.pm25Value !== null ? sensors : null,
      purifierAdvisor
    );
  }, [telemetry, conditions, sensors, purifierAdvisor]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Indoor Air Header */}
      <IndoorAirHeader
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        freshness={telemetry?.freshness ?? "fresh"}
        freshnessExplanation={telemetry?.freshnessExplanation ?? "Fresh telemetry"}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none">
        {/* Loading State */}
        {isLoading && (
          <div className="py-12">
            <TelemetryLoadingState message="Connecting to atmospheric stations and loading indoor microclimate models..." />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="py-8">
            <TelemetryErrorState
              errorMessage={error}
              onRetry={() => {
                void loadTelemetry(selectedLocation);
              }}
            />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && telemetry && indoorPlan && (
          <div className="space-y-8">
            {/* Stale Warning if data exceeds freshness threshold */}
            {telemetry.freshness === "stale" && (
              <StaleDataWarning lastUpdated={telemetry.timestamp} />
            )}

            {/* Attribution banner */}
            <DataAttributionBanner telemetry={telemetry} />

            {/* Outdoor Ambient vs Indoor Physical/Modeled Card */}
            <OutdoorVsIndoorCard
              telemetry={telemetry}
              sensors={sensors.pm25Value !== null ? sensors : null}
              isPurifierRunning={existingPurifier.hasPurifier}
            />

            {/* Two-Column Responsive Layout */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Room Profile & Action Guidance (7 Cols) */}
              <div className="space-y-8 lg:col-span-7">
                <IndoorConditionsPanel
                  conditions={conditions}
                  onConditionsChange={setConditions}
                  sensors={sensors}
                  onSensorsChange={(s) =>
                    setSensors(
                      s ?? {
                        pm25Value: null,
                        co2Ppm: null,
                        temperatureC: null,
                        humidityPercent: null,
                      }
                    )
                  }
                />

                <IndoorRecommendationsList
                  actions={indoorPlan.actions}
                  measurementStatus={indoorPlan.indoorMeasurementStatus}
                />
              </div>

              {/* Right Column: Purifier Sizing & Operating Cost Advisor (5 Cols) */}
              <div className="space-y-8 lg:col-span-5">
                <PurifierAdvisorWidget
                  outdoorPm25={outdoorPm25}
                  budgetPreference={profile?.budgetPreference ?? "limited"}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
