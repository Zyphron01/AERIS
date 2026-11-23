"use client";

import React from "react";
import type { LowEmissionAlternative } from "@/lib/scenarios/types";
import { Leaf, ArrowUpRight, Zap, Train, Sun } from "lucide-react";

interface LowEmissionCardProps {
  readonly alternative: LowEmissionAlternative | null;
}

export function LowEmissionCard({
  alternative,
}: LowEmissionCardProps): React.JSX.Element | null {
  if (!alternative) return null;

  const categoryIcons = {
    zero_emission: Sun,
    mass_transit: Train,
    energy_conservation: Zap,
  };

  const Icon = categoryIcons[alternative.emissionCategory] ?? Leaf;

  return (
    <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white/80 to-teal-50/70 p-6 shadow-xs backdrop-blur-md dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900/60 dark:to-teal-950/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs dark:bg-emerald-500 dark:text-slate-950">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Sustainable Choice & Clean Air Synergy
          </span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Low-Emission Pathway
        </span>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
        {alternative.title}
      </h3>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {alternative.description}
      </p>

      <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-white/80 p-3.5 text-xs text-slate-800 dark:border-emerald-800/60 dark:bg-slate-900/80 dark:text-slate-200">
        <div className="flex items-start gap-2">
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <strong className="text-emerald-900 dark:text-emerald-300">Sustainable Action: </strong>
            <span>{alternative.actionText}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-400/90">
        <strong>Sustainability Co-Benefit: </strong>
        {alternative.sustainabilityBenefit}
      </div>
    </div>
  );
}
