"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { RecommendationAction } from "@/lib/decision-engine/types";
import { PlanBCard } from "./plan-b-card";
import { DecisionExplanationView } from "./decision-explanation";
import { ChevronDown, ChevronUp, BookOpen, Scale, Sparkles, Wind } from "lucide-react";

interface RecommendationCardProps {
  readonly action: RecommendationAction;
  readonly rank: number;
  readonly onExplainAi?: (action: RecommendationAction) => void;
}

export function RecommendationCard({
  action,
  rank,
  onExplainAi,
}: RecommendationCardProps): React.JSX.Element {
  const [showPlanB, setShowPlanB] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const priorityStyles: Record<string, string> = {
    urgent: "border-red-300 bg-red-50 text-red-800 dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-300",
    high: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/50 dark:text-rose-300",
    moderate: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300",
    low: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-300",
  };

  const categoryLabels: Record<string, string> = {
    outdoor_activity: "Outdoor & Exercise",
    indoor_air: "Indoor & Ventilation",
    commute: "Commute & Transit",
    protective_measures: "Protective Shielding",
  };

  return (
    <article
      aria-labelledby={`action-title-${action.id}`}
      className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/70 p-6 shadow-xs backdrop-blur-md transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
    >
      {/* Top Header: Rank, Category, Priority */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-600 text-xs font-extrabold text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
            #{rank}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {categoryLabels[action.category] ?? action.category}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {action.impactClassification === "exposure_reduction" ? "Exposure Reduction" : "Emission Reduction"}
          </span>
        </div>

        <div className={`rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${priorityStyles[action.priority]}`}>
          {action.priority} Priority
        </div>
      </div>

      {/* Main Title & Action Text */}
      <div className="mt-4">
        <h3
          id={`action-title-${action.id}`}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          {action.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed font-medium text-slate-800 dark:text-slate-200">
          {action.actionText}
        </p>
      </div>

      {/* Scientific Reason & Trade-Offs */}
      <div className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        <div>
          <strong className="text-slate-900 dark:text-slate-100">Why this matters:</strong> {action.reason}
        </div>

        <div className="flex items-start gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50/90 p-3 text-[11px] text-slate-700 dark:border-slate-800/80 dark:bg-slate-800/60 dark:text-slate-300">
          <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
          <div>
            <strong>Trade-offs:</strong> {action.tradeOffs}
          </div>
        </div>
      </div>

      {/* Evidence Citations */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
          <BookOpen className="h-3 w-3" />
          <span>Evidence:</span>
        </div>
        {action.evidenceReferences.map((ref, idx) => (
          <span
            key={idx}
            className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {ref}
          </span>
        ))}
      </div>

      {/* Accordion / Expandable Action Toggles */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {action.planB && (
            <button
              type="button"
              onClick={() => setShowPlanB((prev) => !prev)}
              aria-expanded={showPlanB}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition hover:text-teal-800 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              <span>{showPlanB ? "Hide Plan B Alternative" : "View Plan B (Forecast Trigger)"}</span>
              {showPlanB ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowExplanation((prev) => !prev)}
            aria-expanded={showExplanation}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <span>{showExplanation ? "Hide Decision Details" : "Why am I seeing this?"}</span>
            {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {action.category === "indoor_air" && (
            <Link
              href="/indoor-air"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition hover:text-teal-800 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              <Wind className="h-3.5 w-3.5" />
              <span>Open Indoor Air Coach</span>
            </Link>
          )}
        </div>

        {onExplainAi && (
          <button
            type="button"
            onClick={() => onExplainAi(action)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200/90 bg-teal-50/80 px-3 py-1 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 hover:border-teal-300 dark:border-teal-800/80 dark:bg-teal-950/40 dark:text-cyan-300 dark:hover:bg-teal-900/50"
            aria-label={`Explain ${action.title} with AI`}
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
            <span>Explain with AI</span>
          </button>
        )}
      </div>

      {/* Expandable Sections */}
      {showPlanB && action.planB && <PlanBCard planB={action.planB} />}
      {showExplanation && <DecisionExplanationView explanation={action.explanation} />}
    </article>
  );
}
