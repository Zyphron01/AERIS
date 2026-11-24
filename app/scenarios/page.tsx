"use client";

import React from "react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { HouseholdProfile } from "@/lib/decision-engine/types";
import { getStoredHouseholdProfile } from "@/lib/decision-engine/household-profile";
import type { ScenarioType, ScenarioComparisonResult } from "@/lib/scenarios/types";
import type {
  OutdoorTimingInput,
  IndoorVsOutdoorInput,
  CommuteModeInput,
  FiltrationHypotheticalInput,
} from "@/lib/scenarios/schemas";
import {
  compareOutdoorTiming,
  compareIndoorVsOutdoor,
  compareCommuteMode,
  compareFiltrationHypothetical,
} from "@/lib/scenarios/engine";
import { ScenarioHeader } from "@/components/scenarios/scenario-header";
import { ScenarioTabs } from "@/components/scenarios/scenario-tabs";
import { OutdoorTimingPanel } from "@/components/scenarios/outdoor-timing-panel";
import { IndoorVsOutdoorPanel } from "@/components/scenarios/indoor-vs-outdoor-panel";
import { CommuteModePanel } from "@/components/scenarios/commute-mode-panel";
import { FiltrationHypotheticalPanel } from "@/components/scenarios/filtration-hypothetical-panel";
import { DecisionReceiptCard } from "@/components/scenarios/decision-receipt-card";
import { LowEmissionCard } from "@/components/scenarios/low-emission-card";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ScenariosPage(): React.JSX.Element {
  const [locationId, setLocationId] = React.useState<string>("delhi-ncr");
  const [telemetry, setTelemetry] = React.useState<NormalizedTelemetry | null>(null);
  const [profile] = React.useState<HouseholdProfile | null>(() => getStoredHouseholdProfile());
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active scenario type
  const [activeScenarioType, setActiveScenarioType] =
    React.useState<ScenarioType>("outdoor_timing");

  // Inputs for each scenario type
  const [outdoorTimingInput, setOutdoorTimingInput] = React.useState<OutdoorTimingInput>({
    scenarioType: "outdoor_timing",
    baselineHourIso: "",
    alternativeHourIso: "",
    activityType: "exercise",
  });

  const [indoorVsOutdoorInput, setIndoorVsOutdoorInput] = React.useState<IndoorVsOutdoorInput>({
    scenarioType: "indoor_vs_outdoor",
    forecastHourIso: "",
    indoorFiltrationActive: false,
    roomVentilationState: "sealed_windows",
  });

  const [commuteModeInput, setCommuteModeInput] = React.useState<CommuteModeInput>({
    scenarioType: "commute_mode",
    forecastHourIso: "",
    baselineMode: "active_walking_biking",
    alternativeMode: "closed_public_transit_metro",
  });

  const [filtrationInput, setFiltrationInput] = React.useState<FiltrationHypotheticalInput>({
    scenarioType: "filtration_hypothetical",
    roomVolumeCuM: 30,
    ratedCadrM3h: 250,
    fanSpeedMode: "maximum_certified",
  });

  // Fetch telemetry
  const fetchTelemetry = React.useCallback(async (locId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/telemetry?location=${locId}`);
      if (!res.ok) {
        throw new Error(`Telemetry request failed with status: ${res.status}`);
      }
      const data: NormalizedTelemetry = await res.json();
      setTelemetry(data);

      // Initialize default hours from forecast
      const forecast = data.hourlyForecast ?? [];
      const firstHour = forecast[0]?.time ?? new Date().toISOString();
      const fourthHour = forecast[Math.min(4, forecast.length - 1)]?.time ?? firstHour;

      setOutdoorTimingInput((prev) => ({
        ...prev,
        baselineHourIso: prev.baselineHourIso || firstHour,
        alternativeHourIso: prev.alternativeHourIso || fourthHour,
      }));

      setIndoorVsOutdoorInput((prev) => ({
        ...prev,
        forecastHourIso: prev.forecastHourIso || firstHour,
      }));

      setCommuteModeInput((prev) => ({
        ...prev,
        forecastHourIso: prev.forecastHourIso || firstHour,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load atmospheric forecast data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let canceled = false;

    async function loadInitial() {
      try {
        const res = await fetch(`/api/telemetry?location=${locationId}`);
        if (!res.ok) {
          throw new Error(`Telemetry request failed with status: ${res.status}`);
        }
        const data: NormalizedTelemetry = await res.json();
        if (!canceled) {
          setTelemetry(data);
          setError(null);
          setIsLoading(false);

          const forecast = data.hourlyForecast ?? [];
          const firstHour = forecast[0]?.time ?? new Date().toISOString();
          const fourthHour = forecast[Math.min(4, forecast.length - 1)]?.time ?? firstHour;

          setOutdoorTimingInput((prev) => ({
            ...prev,
            baselineHourIso: prev.baselineHourIso || firstHour,
            alternativeHourIso: prev.alternativeHourIso || fourthHour,
          }));

          setIndoorVsOutdoorInput((prev) => ({
            ...prev,
            forecastHourIso: prev.forecastHourIso || firstHour,
          }));

          setCommuteModeInput((prev) => ({
            ...prev,
            forecastHourIso: prev.forecastHourIso || firstHour,
          }));
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load atmospheric forecast data.");
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      canceled = true;
    };
  }, [locationId]);

  // Compute comparison result dynamically
  const comparisonResult: ScenarioComparisonResult | null = React.useMemo(() => {
    if (!telemetry) return null;

    switch (activeScenarioType) {
      case "outdoor_timing":
        return compareOutdoorTiming(telemetry, outdoorTimingInput, profile);
      case "indoor_vs_outdoor":
        return compareIndoorVsOutdoor(telemetry, indoorVsOutdoorInput, profile);
      case "commute_mode":
        return compareCommuteMode(telemetry, commuteModeInput, profile);
      case "filtration_hypothetical":
        return compareFiltrationHypothetical(telemetry, filtrationInput);
      default:
        return null;
    }
  }, [
    telemetry,
    activeScenarioType,
    outdoorTimingInput,
    indoorVsOutdoorInput,
    commuteModeInput,
    filtrationInput,
    profile,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-100 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <ScenarioHeader
        telemetry={telemetry}
        activeLocationId={locationId}
        onLocationChange={(newId) => setLocationId(newId)}
      />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin text-teal-600 dark:text-cyan-400" />
            <p className="mt-4 text-xs font-semibold tracking-wider uppercase">
              Loading atmospheric forecast trajectories...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <span>Forecast Telemetry Error</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => fetchTelemetry(locationId)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Content State */}
        {!isLoading && !error && telemetry && (
          <div className="space-y-6">
            {/* Scenario Navigation Tabs */}
            <ScenarioTabs
              activeType={activeScenarioType}
              onTypeChange={(t) => setActiveScenarioType(t)}
            />

            {/* Active Input Panel */}
            {activeScenarioType === "outdoor_timing" && (
              <OutdoorTimingPanel
                telemetry={telemetry}
                value={outdoorTimingInput}
                onChange={(next) => setOutdoorTimingInput(next)}
              />
            )}

            {activeScenarioType === "indoor_vs_outdoor" && (
              <IndoorVsOutdoorPanel
                telemetry={telemetry}
                value={indoorVsOutdoorInput}
                onChange={(next) => setIndoorVsOutdoorInput(next)}
              />
            )}

            {activeScenarioType === "commute_mode" && (
              <CommuteModePanel
                telemetry={telemetry}
                value={commuteModeInput}
                onChange={(next) => setCommuteModeInput(next)}
              />
            )}

            {activeScenarioType === "filtration_hypothetical" && (
              <FiltrationHypotheticalPanel
                telemetry={telemetry}
                value={filtrationInput}
                onChange={(next) => setFiltrationInput(next)}
              />
            )}

            {/* Output: Decision Receipt Card & Low Emission Card */}
            {comparisonResult && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <DecisionReceiptCard result={comparisonResult} />
                </div>
                <div>
                  <LowEmissionCard alternative={comparisonResult.lowEmissionAlternative} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
