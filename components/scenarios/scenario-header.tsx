"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Sun, Moon, MapPin } from "lucide-react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import { SUPPORTED_LOCATIONS } from "@/lib/telemetry/locations";
import { useTheme } from "@/components/theme/theme-provider";

interface ScenarioHeaderProps {
  readonly telemetry: NormalizedTelemetry | null;
  readonly activeLocationId: string;
  readonly onLocationChange: (id: string) => void;
}

export function ScenarioHeader({
  telemetry,
  activeLocationId,
  onLocationChange,
}: ScenarioHeaderProps): React.JSX.Element {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200/80 bg-white/60 px-4 py-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Navigation & Branding */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
                What-If Scenario Simulator
              </h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Deterministic Decision Receipts & Low-Emission Alternatives
              </span>
            </div>
          </div>
        </div>

        {/* Location Selector & Theme Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800/80">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <label htmlFor="scenario-location-select" className="sr-only">
              Select City for Scenario Simulation
            </label>
            <select
              id="scenario-location-select"
              value={activeLocationId}
              onChange={(e) => onLocationChange(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-hidden dark:text-slate-200"
            >
              {SUPPORTED_LOCATIONS.map((city) => (
                <option key={city.id} value={city.id} className="dark:bg-slate-800">
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {telemetry && (
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 md:inline-block">
              {telemetry.freshnessExplanation}
            </span>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
