"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Check,
  Sun,
  Moon,
  Sparkles,
  UserCheck,
  Cloud,
  CloudUpload,
  BookmarkCheck,
  Bookmark,
} from "lucide-react";
import { SUPPORTED_LOCATIONS } from "@/lib/telemetry/locations";
import type { LocationMetadata, DataFreshness } from "@/lib/telemetry/types";
import type { User } from "@supabase/supabase-js";

interface DailyPlanHeaderProps {
  readonly selectedLocation: LocationMetadata;
  readonly onLocationChange: (location: LocationMetadata) => void;
  readonly freshness: DataFreshness;
  readonly freshnessExplanation: string;
  readonly hasProfile: boolean;
  readonly onEditProfile: () => void;
  readonly theme: "light" | "dark";
  readonly onThemeToggle: () => void;
  readonly user?: User | null;
  readonly onOpenAuth?: () => void;
  readonly onOpenSavedPlans?: () => void;
  readonly onSavePlan?: () => void;
  readonly isSavingPlan?: boolean;
  readonly planSavedSuccess?: boolean;
}

export function DailyPlanHeader({
  selectedLocation,
  onLocationChange,
  freshness,
  freshnessExplanation,
  hasProfile,
  onEditProfile,
  theme,
  onThemeToggle,
  user,
  onOpenAuth,
  onOpenSavedPlans,
  onSavePlan,
  isSavingPlan,
  planSavedSuccess,
}: DailyPlanHeaderProps): React.JSX.Element {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        {/* Brand & Return Navigation */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Back to Live Air Monitor Dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                AERIS Daily Action Plan
              </h1>
              <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-cyan-400 sm:inline-flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                Personalized Intelligence
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Deterministic, Evidence-Based Air Quality Decision Support
            </div>
          </div>
        </div>

        {/* Location Selector & Controls */}
        <div className="flex items-center gap-3">
          {/* Profile Status Badge / Trigger */}
          {hasProfile ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-cyan-300"
              aria-label="Edit Household Profile"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Profile Active</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              aria-label="Set Up Household Profile"
            >
              <span>Set Up Profile</span>
            </button>
          )}

          {/* City Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="city-selector-button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 shadow-xs transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
              aria-label="Select city for environmental recommendations"
            >
              <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{selectedLocation.name}</span>
              <span className="text-[10px] text-slate-400">({selectedLocation.country})</span>
              <span className="ml-1 text-[10px] text-slate-500">▼</span>
            </button>

            {dropdownOpen && (
              <div
                role="listbox"
                aria-label="Select city"
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900"
              >
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
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs transition ${
                        isSelected
                          ? "bg-teal-50 font-semibold text-teal-900 dark:bg-teal-950/70 dark:text-cyan-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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

          {/* Cloud Persistence & Account Controls */}
          {onSavePlan && (
            <button
              type="button"
              onClick={onSavePlan}
              disabled={isSavingPlan}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
                planSavedSuccess
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
              }`}
              aria-label={planSavedSuccess ? "Action plan saved to cloud" : "Save daily action plan to cloud"}
              title={user ? "Save today's plan to your cloud account" : "Sign in to save plan to cloud"}
            >
              {planSavedSuccess ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Saved!</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline">{isSavingPlan ? "Saving..." : "Save Plan"}</span>
                </>
              )}
            </button>
          )}

          {user && onOpenSavedPlans && (
            <button
              type="button"
              onClick={onOpenSavedPlans}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
              aria-label="View cloud-saved action plans"
            >
              <Bookmark className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Saved Plans</span>
            </button>
          )}

          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                user
                  ? "border-teal-200 bg-teal-50/70 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-cyan-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
              aria-label={user ? `Account: ${user.email}` : "Cloud Account Sign In"}
              title={user ? `Signed in as ${user.email}` : "Sign in to sync plans"}
            >
              <Cloud className="h-3.5 w-3.5" />
              <span className="max-w-[100px] truncate">
                {user ? user.email?.split("@")[0] : "Cloud"}
              </span>
            </button>
          )}

          {/* Freshness Badge */}
          <div
            title={freshnessExplanation}
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

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onThemeToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            title="Toggle color theme"
          >
            {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
