"use client";

import React from "react";
import type { NormalizedTelemetry, HourlyForecastPoint } from "@/lib/telemetry/types";
import type { OutdoorTimingInput } from "@/lib/scenarios/schemas";
import { Clock, Info } from "lucide-react";

interface OutdoorTimingPanelProps {
  readonly telemetry: NormalizedTelemetry;
  readonly value: OutdoorTimingInput;
  readonly onChange: (next: OutdoorTimingInput) => void;
}

export function OutdoorTimingPanel({
  telemetry,
  value,
  onChange,
}: OutdoorTimingPanelProps): React.JSX.Element {
  const forecast = telemetry.hourlyForecast ?? [];

  const formatHourOption = (point: HourlyForecastPoint): string => {
    const d = new Date(point.time);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const pm25Str = point.pm2_5 !== null ? `${point.pm2_5} µg/m³ PM2.5` : "PM2.5 unavail.";
    const aqiStr = point.usAqi !== null ? `AQI ${point.usAqi}` : "";
    return `${timeStr} — ${pm25Str} ${aqiStr}`.trim();
  };

  return (
    <div
      role="tabpanel"
      id="scenario-panel-outdoor_timing"
      aria-labelledby="scenario-tab-outdoor_timing"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-cyan-950 dark:text-cyan-300">
          <Clock className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Outdoor Schedule & Dispersion Window Comparison
        </h2>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        Compare forecasted ambient particulate concentrations between your standard scheduled activity time and an alternative diurnal window.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* 1. Baseline Hour */}
        <div>
          <label htmlFor="baseline-hour-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Baseline Activity Hour
          </label>
          <select
            id="baseline-hour-select"
            value={value.baselineHourIso}
            onChange={(e) => onChange({ ...value, baselineHourIso: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {forecast.length > 0 ? (
              forecast.map((pt) => (
                <option key={`base-${pt.time}`} value={pt.time}>
                  {formatHourOption(pt)}
                </option>
              ))
            ) : (
              <option value={value.baselineHourIso}>Current Hour (Live Telemetry)</option>
            )}
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Your typical or proposed starting hour.
          </span>
        </div>

        {/* 2. Alternative Hour */}
        <div>
          <label htmlFor="alternative-hour-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Alternative Shifted Hour
          </label>
          <select
            id="alternative-hour-select"
            value={value.alternativeHourIso}
            onChange={(e) => onChange({ ...value, alternativeHourIso: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {forecast.length > 0 ? (
              forecast.map((pt) => (
                <option key={`alt-${pt.time}`} value={pt.time}>
                  {formatHourOption(pt)}
                </option>
              ))
            ) : (
              <option value={value.alternativeHourIso}>Midday Window (+4 Hours)</option>
            )}
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Potential rescheduled hour for comparison.
          </span>
        </div>

        {/* 3. Activity Type */}
        <div>
          <label htmlFor="activity-type-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Routine Activity Type
          </label>
          <select
            id="activity-type-select"
            value={value.activityType}
            onChange={(e) =>
              onChange({
                ...value,
                activityType: e.target.value as OutdoorTimingInput["activityType"],
              })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="exercise">Cardiovascular Exercise (Running / Cycling)</option>
            <option value="commute">Active Commute (Walking / Biking)</option>
            <option value="errands">Essential Errands / Outdoor Chores</option>
            <option value="leisure">Passive Leisure / Park Visit</option>
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Exertion rate determines respiratory intake volume.
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50/70 p-2.5 text-[11px] text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
        <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <span>
          AERIS compares atmospheric chemical transport forecasts. In winter, surface thermal inversions typically concentrate fine particles near ground level in early morning and late night.
        </span>
      </div>
    </div>
  );
}
