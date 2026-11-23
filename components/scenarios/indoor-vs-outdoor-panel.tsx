"use client";

import React from "react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { IndoorVsOutdoorInput } from "@/lib/scenarios/schemas";
import { Home, AlertCircle } from "lucide-react";

interface IndoorVsOutdoorPanelProps {
  readonly telemetry: NormalizedTelemetry;
  readonly value: IndoorVsOutdoorInput;
  readonly onChange: (next: IndoorVsOutdoorInput) => void;
}

export function IndoorVsOutdoorPanel({
  telemetry,
  value,
  onChange,
}: IndoorVsOutdoorPanelProps): React.JSX.Element {
  const forecast = telemetry.hourlyForecast ?? [];

  return (
    <div
      role="tabpanel"
      id="scenario-panel-indoor_vs_outdoor"
      aria-labelledby="scenario-tab-indoor_vs_outdoor"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
          <Home className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Indoor Microclimate vs. Outdoor Ambient Air
        </h2>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        Simulate shifting physical activity indoors under an unmeasured residential envelope or with certified active mechanical HEPA filtration.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* 1. Target Forecast Hour */}
        <div>
          <label htmlFor="indoor-forecast-hour-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Target Activity Hour
          </label>
          <select
            id="indoor-forecast-hour-select"
            value={value.forecastHourIso}
            onChange={(e) => onChange({ ...value, forecastHourIso: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {forecast.length > 0 ? (
              forecast.map((pt) => {
                const timeStr = new Date(pt.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <option key={`indoor-${pt.time}`} value={pt.time}>
                    {timeStr} ({pt.pm2_5 !== null ? `${pt.pm2_5} µg/m³` : "Forecast"} ambient)
                  </option>
                );
              })
            ) : (
              <option value={value.forecastHourIso}>Current Hour (Live Telemetry)</option>
            )}
          </select>
        </div>

        {/* 2. Filtration State Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Indoor Air Filtration
          </label>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...value, indoorFiltrationActive: false })}
              className={`flex-1 rounded-xl border py-2 px-3 text-xs font-semibold transition ${
                !value.indoorFiltrationActive
                  ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-200"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Passive Envelope
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, indoorFiltrationActive: true })}
              className={`flex-1 rounded-xl border py-2 px-3 text-xs font-semibold transition ${
                value.indoorFiltrationActive
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Active HEPA Purifier
            </button>
          </div>
          <span className="mt-1 block text-[10px] text-slate-400">
            {value.indoorFiltrationActive ? "Assumes certified mechanical HEPA running." : "Natural envelope without mechanical air cleaners."}
          </span>
        </div>

        {/* 3. Window Sealing State */}
        <div>
          <label htmlFor="room-ventilation-state-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Room Sealing State
          </label>
          <select
            id="room-ventilation-state-select"
            value={value.roomVentilationState}
            onChange={(e) =>
              onChange({
                ...value,
                roomVentilationState: e.target.value as IndoorVsOutdoorInput["roomVentilationState"],
              })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="sealed_windows">Sealed Windows & Closed Doors</option>
            <option value="open_windows">Open Windows (Natural Cross-Draft)</option>
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Affects air exchange with outdoor ambient air.
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 text-[11px] text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Scientific Rule 10 Reminder:</strong> Indoor condition is treated as an unmeasured hypothetical microclimate. AERIS never fabricates an indoor sensor reading without a physical in-room monitor.
        </span>
      </div>
    </div>
  );
}
