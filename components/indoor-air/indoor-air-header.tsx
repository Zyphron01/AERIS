"use client";

import React from "react";
import Link from "next/link";
import type { LocationMetadata } from "@/lib/telemetry/types";
import { SUPPORTED_LOCATIONS } from "@/lib/telemetry/locations";
import {
  Home,
  MapPin,
  Calendar,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";

interface IndoorAirHeaderProps {
  readonly selectedLocation: LocationMetadata;
  readonly onLocationChange: (location: LocationMetadata) => void;
  readonly freshness: "fresh" | "stale" | "outdated";
  readonly freshnessExplanation: string;
  readonly theme: "light" | "dark";
  readonly onThemeToggle: () => void;
}

export function IndoorAirHeader({
  selectedLocation,
  onLocationChange,
  freshness,
  freshnessExplanation,
  theme,
  onThemeToggle,
}: IndoorAirHeaderProps): React.JSX.Element {
  const [isLocationMenuOpen, setIsLocationMenuOpen] = React.useState(false);

  const freshnessStyles: Record<string, string> = {
    fresh: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
    stale: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800",
    outdated: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800",
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to Home"
            className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 transition hover:opacity-80 dark:text-slate-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-black text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
              A
            </span>
            <span>AERIS</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Indoor Air Coach
            </h1>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-3">
          {/* Location Selector */}
          <div className="relative">
            <button
              type="button"
              id="indoor-city-selector"
              onClick={() => setIsLocationMenuOpen((prev) => !prev)}
              aria-expanded={isLocationMenuOpen}
              aria-haspopup="listbox"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{selectedLocation.name}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isLocationMenuOpen && (
              <div
                role="listbox"
                aria-labelledby="indoor-city-selector"
                className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900"
              >
                {SUPPORTED_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    role="option"
                    aria-selected={loc.id === selectedLocation.id}
                    onClick={() => {
                      onLocationChange(loc);
                      setIsLocationMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                      loc.id === selectedLocation.id
                        ? "bg-teal-50 font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-cyan-300"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{loc.name}</span>
                    <span className="text-[10px] text-slate-400">{loc.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Freshness Badge */}
          <span
            title={freshnessExplanation}
            className={`hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase sm:inline-block ${
              freshnessStyles[freshness] ?? freshnessStyles.fresh
            }`}
          >
            {freshness}
          </span>

          {/* Nav Links to Daily Plan & Dashboard */}
          <Link
            href="/daily-plan"
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 md:inline-flex"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Daily Plan</span>
          </Link>

          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 md:inline-flex"
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Live Dashboard</span>
          </Link>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
