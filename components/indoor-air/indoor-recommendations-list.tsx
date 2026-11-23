"use client";

import React, { useState } from "react";
import type {
  IndoorGuidanceAction,
  IndoorGuidanceCategory,
  IndoorCostTier,
} from "@/lib/indoor-air/types";
import {
  Wind,
  Flame,
  Filter,
  Thermometer,
  Scale,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

interface IndoorRecommendationsListProps {
  readonly actions: readonly IndoorGuidanceAction[];
  readonly measurementStatus: "measured" | "unmeasured_modeled";
}

export function IndoorRecommendationsList({
  actions,
  measurementStatus,
}: IndoorRecommendationsListProps): React.JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const filteredActions = actions.filter((act) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "zero_cost") return act.costTier === "zero_cost";
    return act.category === selectedCategory;
  });

  const categoryIcons: Record<IndoorGuidanceCategory, React.JSX.Element> = {
    ventilation: <Wind className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
    source_reduction: <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    filtration: <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    thermal_safety: <Thermometer className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
  };

  const priorityStyles: Record<string, string> = {
    urgent: "border-red-300 bg-red-50 text-red-800 dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-300",
    high: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/50 dark:text-rose-300",
    moderate: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300",
    low: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-300",
  };

  const costTierBadges: Record<IndoorCostTier, { label: string; style: string }> = {
    zero_cost: {
      label: "Zero-Cost",
      style: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    low_cost: {
      label: "Low-Cost Measure",
      style: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300",
    },
    equipment: {
      label: "Equipment Investment",
      style: "border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800/70 dark:bg-purple-950/40 dark:text-purple-300",
    },
  };

  const categoryLabels: Record<IndoorGuidanceCategory, string> = {
    ventilation: "Ventilation",
    source_reduction: "Source Reduction",
    filtration: "Air Filtration",
    thermal_safety: "Life-Safety / Thermal",
  };

  return (
    <section aria-labelledby="indoor-guidance-title" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="indoor-guidance-title"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Ranked Indoor Air Guidance
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {filteredActions.length} Actions
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Scientifically ranked interventions based on outdoor ambient load, combustion emissions,
            building envelope airtightness, and human comfort.
          </p>
        </div>

        {/* Filter Pills */}
        <div
          role="group"
          aria-label="Filter actions by category or cost"
          className="flex flex-wrap items-center gap-1.5"
        >
          <SlidersHorizontal className="mr-1 hidden h-3.5 w-3.5 text-slate-400 sm:inline-block" />
          {[
            { id: "all", label: "All" },
            { id: "zero_cost", label: "Zero-Cost" },
            { id: "ventilation", label: "Ventilation" },
            { id: "source_reduction", label: "Source Control" },
            { id: "thermal_safety", label: "Thermal Safety" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedCategory === tab.id
                  ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {measurementStatus === "unmeasured_modeled" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <strong className="font-semibold">Unmeasured Indoor Estimate Notice:</strong> In the absence
            of a physical, calibrated indoor particulate sensor, these recommendations apply
            conservative ASHRAE 62.2 infiltration assumptions. Real indoor concentrations may vary
            significantly based on your specific building airtightness and internal activities.
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching actions found for the selected filter.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="mt-3 text-xs font-semibold text-teal-700 underline dark:text-cyan-400"
            >
              Reset filter to show all recommendations
            </button>
          </div>
        ) : (
          filteredActions.map((action, idx) => {
            const isExpanded = expandedActionId === action.id;
            const costBadge = costTierBadges[action.costTier];

            return (
              <article
                key={action.id}
                aria-labelledby={`indoor-action-title-${action.id}`}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition hover:border-slate-300 dark:border-slate-800/90 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                {/* Header row: Rank, Category, Priority, Cost */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-600 text-xs font-extrabold text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
                      #{idx + 1}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {categoryIcons[action.category]}
                      <span>{categoryLabels[action.category] ?? action.category}</span>
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${costBadge.style}`}
                    >
                      {costBadge.label}
                    </span>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      priorityStyles[action.priority]
                    }`}
                  >
                    {action.priority} Priority
                  </div>
                </div>

                {/* Title & Core Action Text */}
                <div className="mt-4">
                  <h3
                    id={`indoor-action-title-${action.id}`}
                    className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg"
                  >
                    {action.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed font-medium text-slate-800 dark:text-slate-200">
                    {action.actionText}
                  </p>
                </div>

                {/* Why it Matters (Science Rationale) */}
                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/90 p-3.5 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-800/60 dark:text-slate-300">
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    Scientific Rationale:
                  </strong>{" "}
                  {action.whyItMatters}
                </div>

                {/* Trade-Offs & Real-world friction */}
                <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <strong className="font-medium text-slate-700 dark:text-slate-300">
                      Trade-Offs & Friction:
                    </strong>{" "}
                    {action.tradeOffs}
                  </div>
                </div>

                {/* Uncertainty Notice */}
                <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <div>
                    <strong className="font-medium text-slate-600 dark:text-slate-300">
                      Uncertainty Notice:
                    </strong>{" "}
                    {action.uncertaintyNotice}
                  </div>
                </div>

                {/* Evidence Citations */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                  <div className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                    <BookOpen className="h-3 w-3" />
                    <span>Evidence:</span>
                  </div>
                  {action.evidenceReferences.map((ref, rIdx) => (
                    <span
                      key={rIdx}
                      className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {ref}
                    </span>
                  ))}
                </div>

                {/* Expandable Model Assumptions */}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                    aria-expanded={isExpanded}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    <span>{isExpanded ? "Hide Engineering Assumptions" : "View Engineering Assumptions"}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Underlying Technical Assumptions:
                    </div>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {action.assumptions.map((assump, aIdx) => (
                        <li key={aIdx} className="leading-relaxed">
                          {assump}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
