"use client";

import React from "react";
import { Clock, Home, Navigation, Filter } from "lucide-react";
import type { ScenarioType } from "@/lib/scenarios/types";

interface ScenarioTabsProps {
  readonly activeType: ScenarioType;
  readonly onTypeChange: (type: ScenarioType) => void;
}

const TABS: readonly {
  readonly id: ScenarioType;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ElementType;
}[] = [
  {
    id: "outdoor_timing",
    label: "Outdoor Timing",
    description: "Compare forecast hours for exercise or errands",
    icon: Clock,
  },
  {
    id: "indoor_vs_outdoor",
    label: "Indoor vs. Outdoor",
    description: "Compare open-air exertion with sheltered microclimates",
    icon: Home,
  },
  {
    id: "commute_mode",
    label: "Commute Modality",
    description: "Compare walking, metro, auto, and vehicle barriers",
    icon: Navigation,
  },
  {
    id: "filtration_hypothetical",
    label: "Filtration Sizing",
    description: "Simulate room volume and CADR air exchange targets",
    icon: Filter,
  },
];

export function ScenarioTabs({
  activeType,
  onTypeChange,
}: ScenarioTabsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="tablist" aria-label="Scenario Selection Tabs">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeType === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`scenario-panel-${tab.id}`}
            id={`scenario-tab-${tab.id}`}
            type="button"
            onClick={() => onTypeChange(tab.id)}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition ${
              isActive
                ? "border-teal-600 bg-teal-50/90 shadow-xs dark:border-cyan-500 dark:bg-cyan-950/40"
                : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                  isActive
                    ? "bg-teal-600 text-white dark:bg-cyan-500 dark:text-slate-950"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {isActive && (
                <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-cyan-400" />
              )}
            </div>
            <div className="mt-1">
              <span
                className={`block text-xs font-bold ${
                  isActive
                    ? "text-teal-900 dark:text-cyan-200"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {tab.label}
              </span>
              <span className="block text-[10px] leading-tight text-slate-600 dark:text-slate-400">
                {tab.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
