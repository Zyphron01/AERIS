import React from "react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import { Database, ShieldAlert, Cpu } from "lucide-react";

interface DataAttributionBannerProps {
  readonly telemetry: NormalizedTelemetry;
}

export function DataAttributionBanner({
  telemetry,
}: DataAttributionBannerProps): React.JSX.Element {
  return (
    <footer className="mt-12 rounded-3xl border border-slate-200/90 bg-white p-6 text-xs text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Attribution Column 1: Source */}
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-cyan-400" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-200">
              Telemetry Sourcing & Model Domain
            </div>
            <div className="mt-1 leading-relaxed">
              {telemetry.source}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Provider: Open-Meteo API v1 (Non-commercial CC-BY 4.0 / Copernicus Atmosphere Data Service)
            </div>
          </div>
        </div>

        {/* Attribution Column 2: Data Kind & Methodology */}
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-cyan-400" />
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-200">
              <span>Data Classification</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {telemetry.dataKind}
              </span>
            </div>
            <div className="mt-1 leading-relaxed">
              Global chemical transport model projection calibrated against regional CPCB and EPA concentration breakpoints.
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Observation Time: {new Date(telemetry.timestamp).toLocaleString()} | Retrieved: {new Date(telemetry.retrievedAt).toLocaleTimeString()}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-teal-800 dark:text-cyan-400">
              {telemetry.freshnessExplanation}
            </div>
          </div>
        </div>

        {/* Attribution Column 3: Medical / Regulatory Disclaimer */}
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-200">
              Public Health Notice
            </div>
            <div className="mt-1 leading-relaxed">
              {telemetry.disclaimer}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
