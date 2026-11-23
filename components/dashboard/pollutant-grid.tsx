import React from "react";
import type { PollutantMeasurement } from "@/lib/telemetry/types";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface PollutantGridProps {
  readonly pollutants: readonly PollutantMeasurement[];
}

function getPollutantExplanation(code: string): string {
  switch (code) {
    case "pm2_5":
      return "Fine inhalable particles ≤ 2.5 µm that penetrate deep into alveolar spaces and bloodstream.";
    case "pm10":
      return "Inhalable particulate matter ≤ 10 µm from dust, road emissions, and agricultural burning.";
    case "o3":
      return "Photochemical oxidant formed from sunlight-driven reactions of NOx and volatile organic compounds.";
    case "no2":
      return "Combustion gas from vehicle engines and power stations, irritating bronchial pathways.";
    case "so2":
      return "Gas emitted from sulfur-rich fossil fuel burning, coal plants, and industrial refining.";
    case "co":
      return "Colorless gas from incomplete combustion, reducing hemoglobin oxygen transport. CPCB scale uses mg/m³.";
    case "dust":
      return "Atmospheric wind-lofted particulate mineral matter contributing to surface turbidity.";
    default:
      return "Atmospheric chemical concentration.";
  }
}

export function PollutantGrid({ pollutants }: PollutantGridProps): React.JSX.Element {
  return (
    <section aria-labelledby="pollutants-heading" className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="pollutants-heading"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Pollutant Concentration Profiles
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Current 1-hour modeled values alongside CPCB regulatory rolling averages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pollutants.map((p) => {
          const isOverGuideline =
            p.who24hGuideline !== undefined && p.value !== null && p.value > p.who24hGuideline;
          const ratio =
            p.who24hGuideline !== undefined && p.value !== null
              ? (p.value / p.who24hGuideline).toFixed(1)
              : null;

          return (
            <div
              key={p.code}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                    {p.code.toUpperCase().replace("_", ".")}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {p.averagingPeriod}
                  </span>
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {p.name}
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {p.value !== null ? p.value : "—"}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{p.unit}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">(1-hr)</span>
                </div>

                {/* Rolling Average for CPCB AQI Calculation */}
                {p.rollingAverageValue !== undefined && (
                  <div className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                    <span className="font-medium">CPCB Rolling Avg: </span>
                    <span className="font-semibold">
                      {p.rollingAverageValue !== null
                        ? `${p.rollingAverageValue} ${p.rollingAverageUnit ?? p.unit}`
                        : "Insufficient history (< threshold)"}
                    </span>
                  </div>
                )}

                <p className="mt-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {getPollutantExplanation(p.code)}
                </p>
              </div>

              {p.who24hGuideline !== undefined && (
                <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">WHO 24h Guideline:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {p.who24hGuideline} {p.unit}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    {isOverGuideline ? (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{ratio}x WHO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Within WHO</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
