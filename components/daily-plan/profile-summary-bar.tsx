"use client";

import React from "react";
import type { HouseholdProfile } from "@/lib/decision-engine/types";
import { Users, Bike, Wind, ShieldAlert, Edit2, Trash2 } from "lucide-react";

interface ProfileSummaryBarProps {
  readonly profile: HouseholdProfile;
  readonly onEdit: () => void;
  readonly onClear: () => void;
}

export function ProfileSummaryBar({
  profile,
  onEdit,
  onClear,
}: ProfileSummaryBarProps): React.JSX.Element {
  const memberLabels: Record<string, string> = {
    adults: "Adults",
    children: "Children",
    older_adults: "Seniors",
    infants: "Infants",
  };

  const commuteLabels: Record<string, string> = {
    active_walking_biking: "Active (Walk/Bike)",
    public_transit: "Public Transit",
    personal_vehicle: "Car/Motorbike",
    work_from_home: "Work From Home",
  };

  const filtrationLabels: Record<string, string> = {
    hepa_purifier: "HEPA Purifier",
    hvac_filter: "Central HVAC",
    simple_fan: "Fan Only",
    none: "No Purifier",
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/70 p-5 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-cyan-400">
              Active Household Profile
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Stored Locally
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Members pill */}
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200">
              <Users className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{profile.members.map((m) => memberLabels[m] ?? m).join(", ")}</span>
            </span>

            {/* Commute pill */}
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200">
              <Bike className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{commuteLabels[profile.primaryCommute] ?? profile.primaryCommute}</span>
            </span>

            {/* Filtration pill */}
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200">
              <Wind className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{filtrationLabels[profile.filtration] ?? profile.filtration}</span>
            </span>

            {/* Sensitivity pill if declared */}
            {profile.declaredSensitivity !== "none" && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="capitalize">{profile.declaredSensitivity.replace("_", " / ")}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            aria-label="Edit household profile"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-xs transition hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
            aria-label="Clear stored household profile"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
}
