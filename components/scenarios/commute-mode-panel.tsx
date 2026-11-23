"use client";

import React from "react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { CommuteModeInput } from "@/lib/scenarios/schemas";
import { Navigation } from "lucide-react";

interface CommuteModePanelProps {
  readonly telemetry: NormalizedTelemetry;
  readonly value: CommuteModeInput;
  readonly onChange: (next: CommuteModeInput) => void;
}

const COMMUTE_OPTIONS = [
  {
    id: "active_walking_biking",
    label: "Active Commute (Walking or Cycling)",
    description: "Zero emissions; direct roadside kerbside exposure; higher exertion breathing rate.",
  },
  {
    id: "open_two_wheeler_auto",
    label: "Open Motorized (Two-Wheeler / Auto-Rickshaw)",
    description: "Ground-level exhaust queue exposure; open ambient air contact.",
  },
  {
    id: "closed_public_transit_metro",
    label: "Closed Public Transit (Electric Metro)",
    description: "Lowest passenger emissions; dedicated grade-separated corridor; air-conditioned cabin.",
  },
  {
    id: "private_car_ac",
    label: "Private Automobile (AC Cabin)",
    description: "Partial cabin barrier with recirculated air filter; high urban congestion footprint.",
  },
] as const;

export function CommuteModePanel({
  telemetry,
  value,
  onChange,
}: CommuteModePanelProps): React.JSX.Element {
  const forecast = telemetry.hourlyForecast ?? [];

  return (
    <div
      role="tabpanel"
      id="scenario-panel-commute_mode"
      aria-labelledby="scenario-tab-commute_mode"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Navigation className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Commute Modality & Physical Barrier Comparison
        </h2>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        Evaluate the micro-environmental exposure barrier and urban emission footprint between active, open-air, mass transit, and personal vehicle modes.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* 1. Commute Hour */}
        <div>
          <label htmlFor="commute-hour-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Commute Departure Hour
          </label>
          <select
            id="commute-hour-select"
            value={value.forecastHourIso}
            onChange={(e) => onChange({ ...value, forecastHourIso: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {forecast.length > 0 ? (
              forecast.map((pt) => {
                const timeStr = new Date(pt.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <option key={`commute-${pt.time}`} value={pt.time}>
                    {timeStr} ({pt.pm2_5 !== null ? `${pt.pm2_5} µg/m³` : "Forecast"} ambient)
                  </option>
                );
              })
            ) : (
              <option value={value.forecastHourIso}>Current Hour (Live Telemetry)</option>
            )}
          </select>
        </div>

        {/* 2. Baseline Mode */}
        <div>
          <label htmlFor="baseline-commute-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Baseline Commute Mode
          </label>
          <select
            id="baseline-commute-select"
            value={value.baselineMode}
            onChange={(e) =>
              onChange({
                ...value,
                baselineMode: e.target.value as CommuteModeInput["baselineMode"],
              })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {COMMUTE_OPTIONS.map((opt) => (
              <option key={`base-mode-${opt.id}`} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Current routine travel choice.
          </span>
        </div>

        {/* 3. Alternative Mode */}
        <div>
          <label htmlFor="alternative-commute-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Alternative Modality to Test
          </label>
          <select
            id="alternative-commute-select"
            value={value.alternativeMode}
            onChange={(e) =>
              onChange({
                ...value,
                alternativeMode: e.target.value as CommuteModeInput["alternativeMode"],
              })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {COMMUTE_OPTIONS.map((opt) => (
              <option key={`alt-mode-${opt.id}`} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Proposed sustainable or protective alternative.
          </span>
        </div>
      </div>
    </div>
  );
}
