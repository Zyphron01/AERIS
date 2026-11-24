"use client";

import React from "react";
import { useTelemetry } from "@/lib/telemetry/use-telemetry";
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
  const { telemetry, isLoading, error, refetch } = useTelemetry(locationId);
  const [profile] = React.useState<HouseholdProfile | null>(() => getStoredHouseholdProfile());

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

  // Derive effective scenario inputs against active telemetry forecast without cascading effect state
  const resolvedOutdoorTimingInput = React.useMemo<OutdoorTimingInput>(() => {
    if (!telemetry) return outdoorTimingInput;
    const forecast = telemetry.hourlyForecast ?? [];
    const firstHour = forecast[0]?.time ?? "";
    const fourthHour = forecast[Math.min(4, forecast.length - 1)]?.time ?? firstHour;
    const hasBaseline = forecast.some((p) => p.time === outdoorTimingInput.baselineHourIso);
    const hasAlt = forecast.some((p) => p.time === outdoorTimingInput.alternativeHourIso);
    return {
      ...outdoorTimingInput,
      baselineHourIso: hasBaseline ? outdoorTimingInput.baselineHourIso : firstHour,
      alternativeHourIso: hasAlt ? outdoorTimingInput.alternativeHourIso : fourthHour,
    };
  }, [telemetry, outdoorTimingInput]);

  const resolvedIndoorVsOutdoorInput = React.useMemo<IndoorVsOutdoorInput>(() => {
    if (!telemetry) return indoorVsOutdoorInput;
    const forecast = telemetry.hourlyForecast ?? [];
    const firstHour = forecast[0]?.time ?? "";
    const hasHour = forecast.some((p) => p.time === indoorVsOutdoorInput.forecastHourIso);
    return {
      ...indoorVsOutdoorInput,
      forecastHourIso: hasHour ? indoorVsOutdoorInput.forecastHourIso : firstHour,
    };
  }, [telemetry, indoorVsOutdoorInput]);

  const resolvedCommuteModeInput = React.useMemo<CommuteModeInput>(() => {
    if (!telemetry) return commuteModeInput;
    const forecast = telemetry.hourlyForecast ?? [];
    const firstHour = forecast[0]?.time ?? "";
    const hasHour = forecast.some((p) => p.time === commuteModeInput.forecastHourIso);
    return {
      ...commuteModeInput,
      forecastHourIso: hasHour ? commuteModeInput.forecastHourIso : firstHour,
    };
  }, [telemetry, commuteModeInput]);

  // Compute comparison result dynamically
  const comparisonResult: ScenarioComparisonResult | null = React.useMemo(() => {
    if (!telemetry) return null;

    switch (activeScenarioType) {
      case "outdoor_timing":
        return compareOutdoorTiming(telemetry, resolvedOutdoorTimingInput, profile);
      case "indoor_vs_outdoor":
        return compareIndoorVsOutdoor(telemetry, resolvedIndoorVsOutdoorInput, profile);
      case "commute_mode":
        return compareCommuteMode(telemetry, resolvedCommuteModeInput, profile);
      case "filtration_hypothetical":
        return compareFiltrationHypothetical(telemetry, filtrationInput);
      default:
        return null;
    }
  }, [
    telemetry,
    activeScenarioType,
    resolvedOutdoorTimingInput,
    resolvedIndoorVsOutdoorInput,
    resolvedCommuteModeInput,
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
              onClick={() => void refetch()}
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
                value={resolvedOutdoorTimingInput}
                onChange={(next) => setOutdoorTimingInput(next)}
              />
            )}

            {activeScenarioType === "indoor_vs_outdoor" && (
              <IndoorVsOutdoorPanel
                telemetry={telemetry}
                value={resolvedIndoorVsOutdoorInput}
                onChange={(next) => setIndoorVsOutdoorInput(next)}
              />
            )}

            {activeScenarioType === "commute_mode" && (
              <CommuteModePanel
                telemetry={telemetry}
                value={resolvedCommuteModeInput}
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
