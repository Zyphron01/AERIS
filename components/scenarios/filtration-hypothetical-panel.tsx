"use client";

import React from "react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { FiltrationHypotheticalInput } from "@/lib/scenarios/schemas";
import { Filter, Sliders, AlertTriangle } from "lucide-react";

interface FiltrationHypotheticalPanelProps {
  readonly telemetry: NormalizedTelemetry;
  readonly value: FiltrationHypotheticalInput;
  readonly onChange: (next: FiltrationHypotheticalInput) => void;
}

export function FiltrationHypotheticalPanel({
  telemetry,
  value,
  onChange,
}: FiltrationHypotheticalPanelProps): React.JSX.Element {
  const achDelivered = Math.round((value.ratedCadrM3h / value.roomVolumeCuM) * 10) / 10;
  const currentAmbientPm25 = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;

  return (
    <div
      role="tabpanel"
      id="scenario-panel-filtration_hypothetical"
      aria-labelledby="scenario-tab-filtration_hypothetical"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Filter className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Mechanical Filtration Sizing & Air Exchange Simulation
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Hypothetical Simulation
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        Simulate the theoretical clean air exchange rate (ACH) under ANSI/AHAM AC-1 engineering benchmarks for a specific room volume and rated purifier CADR.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* 1. Room Volume */}
        <div>
          <label htmlFor="sim-room-volume-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Target Room Volume (m³)
          </label>
          <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <input
              id="sim-room-volume-input"
              type="number"
              min={5}
              max={500}
              step={1}
              value={value.roomVolumeCuM}
              onChange={(e) =>
                onChange({
                  ...value,
                  roomVolumeCuM: Math.max(1, Number(e.target.value) || 30),
                })
              }
              className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-hidden dark:text-slate-100"
            />
            <span className="text-[11px] font-medium text-slate-400">m³</span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-400">
            e.g. 4m × 3m × 2.5m ceiling = 30 m³.
          </span>
        </div>

        {/* 2. Rated CADR */}
        <div>
          <label htmlFor="sim-cadr-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Rated Clean Air Delivery Rate (CADR)
          </label>
          <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <input
              id="sim-cadr-input"
              type="number"
              min={20}
              max={2000}
              step={10}
              value={value.ratedCadrM3h}
              onChange={(e) =>
                onChange({
                  ...value,
                  ratedCadrM3h: Math.max(1, Number(e.target.value) || 200),
                })
              }
              className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-hidden dark:text-slate-100"
            />
            <span className="text-[11px] font-medium text-slate-400">m³/h</span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-400">
            Manufacturer AHAM certified smoke CADR.
          </span>
        </div>

        {/* 3. Fan Speed Assumption */}
        <div>
          <label htmlFor="sim-fan-speed-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Operational Fan Speed Mode
          </label>
          <select
            id="sim-fan-speed-select"
            value={value.fanSpeedMode}
            onChange={(e) =>
              onChange({
                ...value,
                fanSpeedMode: e.target.value as FiltrationHypotheticalInput["fanSpeedMode"],
              })
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="maximum_certified">Maximum Speed (AHAM Certified Test Rating)</option>
            <option value="low_quiet_unverified">Low / Sleep Mode (Unverified Derated CADR)</option>
          </select>
          <span className="mt-1 block text-[10px] text-slate-400">
            Low speeds deliver unverified, lower clean air rates.
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">
            Delivered Air Exchange Rate: <strong className="font-mono text-sm font-extrabold">{achDelivered} ACH</strong>
          </span>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
          Target Benchmark: ~5.0 ACH {currentAmbientPm25 !== null ? `(${currentAmbientPm25} µg/m³ ambient)` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span>
          Mathematical modeling per AHAM AC-1 (CADR / Volume). Does not measure physical room PM2.5 or guarantee clinical outcomes.
        </span>
      </div>
    </div>
  );
}
