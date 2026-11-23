import React from "react";
import type { AqiDetail } from "@/lib/telemetry/types";
import { Info, ShieldCheck, AlertCircle } from "lucide-react";

interface AqiOverviewCardProps {
  readonly usAqi: AqiDetail;
  readonly cpcbAqi: AqiDetail;
  readonly europeanAqi: AqiDetail;
}

export function AqiOverviewCard({
  usAqi,
  cpcbAqi,
  europeanAqi,
}: AqiOverviewCardProps): React.JSX.Element {
  const isCpcbAvailable = cpcbAqi.value !== null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Primary Display: Indian CPCB National AQI (Relevant for Delhi NCR default) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-teal-700 dark:text-cyan-400">
                Primary Regional Metric
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Standard: IN-CPCB (2014)
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Indian National Air Quality Index (NAQI)
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Model-Derived CPCB-Method Estimate (Rolling 24h & 8h Averaging Windows)
            </p>
          </div>

          {isCpcbAvailable ? (
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 font-semibold shadow-xs ${cpcbAqi.colorClass}`}
            >
              <span className="text-3xl font-extrabold">{cpcbAqi.value}</span>
              <span className="text-sm">/ 500</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Indian AQI estimate unavailable</span>
            </div>
          )}
        </div>

        {isCpcbAvailable ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">CPCB Category</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {cpcbAqi.category}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Dominant Pollutant</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {cpcbAqi.dominantPollutant ?? "Particulate Matter"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Health Impact Guidance</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {cpcbAqi.value !== null && cpcbAqi.value > 200
                  ? "Respiratory distress possible on prolonged exposure. Sensitive groups avoid outdoors."
                  : "Air quality is acceptable for healthy individuals. Monitor during exercise."}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Data Sufficiency Requirement Not Met
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              {cpcbAqi.unavailabilityReason ||
                "Official CPCB methodology requires at least 3 monitored pollutants, including PM2.5 or PM10, across 24-hr and 8-hr rolling windows. Telemetry is reported truthfully rather than fabricating an index."}
            </p>
          </div>
        )}

        {/* Visual CPCB Breakpoint Bar */}
        <div className="mt-6">
          <div className="mb-1.5 flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <span>Good (0-50)</span>
            <span>Mod (101-200)</span>
            <span>Poor (201-300)</span>
            <span>Very Poor (301-400)</span>
            <span>Severe (401-500)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: isCpcbAvailable
                  ? `${Math.min(100, Math.max(5, ((cpcbAqi.value ?? 0) / 500) * 100))}%`
                  : "0%",
                backgroundColor:
                  cpcbAqi.value && cpcbAqi.value <= 100
                    ? "#10B981"
                    : cpcbAqi.value && cpcbAqi.value <= 200
                    ? "#F59E0B"
                    : cpcbAqi.value && cpcbAqi.value <= 300
                    ? "#F97316"
                    : "#EF4444",
              }}
            />
          </div>
        </div>
      </div>

      {/* Secondary International Standards Card */}
      <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-600 dark:text-slate-400">
              International Equivalencies
            </h3>
          </div>

          {/* US EPA Standard */}
          <div className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                US EPA Air Quality Index
              </span>
              <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${usAqi.colorClass}`}>
                {usAqi.value ?? "—"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Category: <span className="font-medium text-slate-800 dark:text-slate-200">{usAqi.category}</span>
            </div>
          </div>

          {/* European EAQI Standard */}
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                European Index (EAQI)
              </span>
              <span className="rounded-lg bg-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                Level {europeanAqi.value ?? "—"} / 6
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Category: <span className="font-medium text-slate-800 dark:text-slate-200">{europeanAqi.category}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-[11px] leading-relaxed text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-cyan-300">
          <ShieldCheck className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
          Standards are strictly partitioned. AERIS never computes or presents US EPA index numbers as Indian National AQI.
        </div>
      </div>
    </div>
  );
}
