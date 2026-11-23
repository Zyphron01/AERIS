"use client";

import React from "react";
import type { DecisionExplanation } from "@/lib/decision-engine/types";
import { HelpCircle, CheckCircle2, AlertTriangle, Database } from "lucide-react";

interface DecisionExplanationProps {
  readonly explanation: DecisionExplanation;
}

export function DecisionExplanationView({
  explanation,
}: DecisionExplanationProps): React.JSX.Element {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <HelpCircle className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
        <span>Decision Audit Trail — Transparent Algorithm Factors</span>
      </div>

      <div className="mt-3 space-y-3">
        {/* Influencing factors */}
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            Influencing Inputs:
          </div>
          <ul className="mt-1 space-y-1">
            {explanation.influencingFactors.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-teal-600 dark:text-cyan-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rule ID & Attribution */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/80 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div>
            <strong>Rule Triggered:</strong> <span className="font-mono">{explanation.ruleTriggered}</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3 text-slate-400" />
            <span>{explanation.sourceAttribution}</span>
          </div>
          <div>
            <strong>Timestamp:</strong> {new Date(explanation.dataTimestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Assumptions & Uncertainties */}
        <div className="border-t border-slate-200/80 pt-2 text-[11px] leading-relaxed dark:border-slate-800">
          <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
            <div>
              <strong>Model Assumptions & Limitations:</strong>{" "}
              {explanation.assumptions.join(" ")} {explanation.uncertainties.join(" ")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
