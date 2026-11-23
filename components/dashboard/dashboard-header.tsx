"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, MapPin, Check, Sun, Moon } from "lucide-react";
import { SUPPORTED_LOCATIONS } from "@/lib/telemetry/locations";
import type { LocationMetadata, DataFreshness } from "@/lib/telemetry/types";

interface DashboardHeaderProps {
  readonly selectedLocation: LocationMetadata;
  readonly onLocationChange: (location: LocationMetadata) => void;
  readonly onRefresh: () => void;
  readonly isRefreshing: boolean;
  readonly freshness: DataFreshness;
  readonly lastUpdated: string;
  readonly theme: "light" | "dark";
  readonly onThemeToggle: () => void;
}

export function DashboardHeader({
  selectedLocation,
  onLocationChange,
  onRefresh,
  isRefreshing,
  freshness,
  lastUpdated,
  theme,
  onThemeToggle,
}: DashboardHeaderProps): React.JSX.Element {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        {/* Brand & Return Navigation */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to Home"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                AERIS Live Air Monitor
              </h1>
              <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-cyan-400 sm:inline-block">
                Live Telemetry
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Synchronizing..."}
            </div>
          </div>
        </div>

        {/* Location Selector & Actions */}
        <div className="flex items-center gap-3">
          {/* City Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="city-selector-button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 shadow-xs transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{selectedLocation.name}</span>
              <span className="text-[10px] text-slate-400">({selectedLocation.country})</span>
              <span className="ml-1 text-[10px] text-slate-500">▼</span>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900"
                role="listbox"
                aria-label="Supported locations"
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Demonstration Cities
                </div>
                {SUPPORTED_LOCATIONS.map((loc) => {
                  const isSelected = loc.id === selectedLocation.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onLocationChange(loc);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? "bg-teal-50 font-semibold text-teal-700 dark:bg-slate-800 dark:text-cyan-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div>
                        <div>{loc.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {loc.region}, {loc.country}
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Freshness Badge */}
          <div
            title={
              freshness === "fresh"
                ? "Fresh: Observation validity timestamp is within the last 90 minutes."
                : freshness === "stale"
                ? "Stale: Observation is between 90 and 180 minutes old. Refresh recommended."
                : "Outdated: Observation is older than 180 minutes. Upstream model update pending."
            }
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex cursor-help ${
              freshness === "fresh"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                : freshness === "stale"
                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                freshness === "fresh" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="capitalize">{freshness}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Refresh environmental readings"
            title="Refresh telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onThemeToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
