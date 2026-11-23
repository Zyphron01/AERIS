"use client";

import React from "react";
import type { PlanBAlternative } from "@/lib/decision-engine/types";
import { AlertCircle, Clock, ArrowRight } from "lucide-react";

interface PlanBCardProps {
  readonly planB: PlanBAlternative;
}

export function PlanBCard({ planB }: PlanBCardProps): React.JSX.Element {
  return (
    <div className="mt-4 rounded-2xl border border-teal-200/90 bg-teal-50/70 p-4 text-xs dark:border-teal-900/60 dark:bg-teal-950/30">
      <div className="flex items-center gap-2 font-semibold text-teal-900 dark:text-cyan-300">
        <AlertCircle className="h-4 w-4 shrink-0 text-teal-600 dark:text-cyan-400" />
        <span>Plan B — Conditional Forecast Alternative</span>
      </div>

      <div className="mt-2.5 space-y-2 text-slate-700 dark:text-slate-300">
        <div className="flex items-start gap-1.5">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Trigger:</span>
          <span>{planB.triggerCondition}</span>
        </div>

        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Clock className="mt-0.5 h-3 w-3 shrink-0" />
          <span>Valid Horizon: {planB.validForecastPeriod} ({planB.source})</span>
        </div>

        <div className="rounded-xl border border-teal-300/60 bg-white/80 p-3 dark:border-teal-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-1.5 font-semibold text-teal-950 dark:text-cyan-200">
            <ArrowRight className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
            <span>Alternative Action</span>
          </div>
          <div className="mt-1 leading-relaxed text-slate-800 dark:text-slate-200">
            {planB.alternativeAction}
          </div>
          <div className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <strong>Scientific Rationale:</strong> {planB.reasonForChange}
          </div>
        </div>
      </div>
    </div>
  );
}
