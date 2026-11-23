"use client";

import React from "react";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { OptionalIndoorSensors } from "@/lib/indoor-air/types";
import { Cloud, Home, ShieldAlert, Cpu } from "lucide-react";

interface OutdoorVsIndoorCardProps {
  readonly telemetry: NormalizedTelemetry;
  readonly sensors: OptionalIndoorSensors | null;
  readonly isPurifierRunning: boolean;
}

export function OutdoorVsIndoorCard({
  telemetry,
  sensors,
  isPurifierRunning,
}: OutdoorVsIndoorCardProps): React.JSX.Element {
  const outdoorPm25 = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const outdoorAqi = telemetry.aqi.cpcbAqi.value ?? telemetry.aqi.usAqi.value;
  const outdoorCategory = telemetry.aqi.cpcbAqi.category;

  const hasSensors = sensors && sensors.pm25Value !== null;

  // Illustrative literature infiltration range: unsealed residential envelopes typically admit
  // 30% to 80%+ of outdoor ambient particulates depending on window weatherization and wind speed.
  const lowerBoundPm25 = outdoorPm25 !== null ? Math.round(outdoorPm25 * 0.3) : null;
  const upperBoundPm25 = outdoorPm25 !== null ? Math.round(outdoorPm25 * 0.8) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Outdoor Ambient Context */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/70 p-6 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Cloud className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Outdoor Ambient Air
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {telemetry.dataKind}
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {outdoorPm25 !== null ? `${outdoorPm25} µg/m³` : "—"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              PM2.5 Ambient Concentration
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300">
              {outdoorCategory} {outdoorAqi ? `(${outdoorAqi})` : ""}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div>
            <span className="block text-[10px] text-slate-400">Temp</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {telemetry.weather.temperatureC}°C
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400">Humidity</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {telemetry.weather.relativeHumidityPercent}%
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400">Wind</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {telemetry.weather.windSpeedKmH} km/h
            </span>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          Source: {telemetry.source} • Observation: {new Date(telemetry.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* 2. Indoor Environment Status */}
      <div className="rounded-3xl border border-teal-200/90 bg-white/70 p-6 shadow-xs backdrop-blur-md dark:border-teal-900/60 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
              <Home className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-teal-800 dark:text-cyan-300">
              Indoor Status
            </span>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
              hasSensors
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
            }`}
          >
            {hasSensors ? "Measured Observation" : "Unmeasured / No In-Room Sensor"}
          </span>
        </div>

        {hasSensors ? (
          <div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {sensors.pm25Value} µg/m³
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Direct Physical Sensor PM2.5 ({sensors.deviceLabel || "Local Monitor"})
                </div>
              </div>
              {sensors.co2Ppm && (
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {sensors.co2Ppm} ppm
                  </div>
                  <div className="text-[10px] text-slate-400">Ventilation Indicator (CO2)</div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Physical In-Room Monitoring Active</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Indoor concentrations reflect physical in-room sensor observations at this specific sampling point. Particulate levels can stratify across room heights and between adjacent living spaces.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mt-4 flex flex-col gap-1">
              <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Indoor PM2.5 not measured
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Notice: Unmeasured Estimate • {isPurifierRunning ? "Purifier Running (Declared)" : "Passive Residential Envelope"}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Notice: Unmeasured Estimate & Illustrative Sensitivity Exercise</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                No physical indoor air monitor detected. This range is strictly an illustrative, assumption-based sensitivity exercise derived from generalized building science literature (NIST / EPA), <strong>never a personalized prediction interval or measurement</strong> for your specific home.
              </p>
              {lowerBoundPm25 !== null && upperBoundPm25 !== null && (
                <div className="mt-2.5 flex items-center justify-between rounded-xl border border-amber-200/90 bg-white/80 p-2.5 text-xs dark:border-amber-800 dark:bg-slate-900/80">
                  <span className="text-slate-600 dark:text-slate-400">
                    Illustrative Infiltration Range ({outdoorPm25} µg/m³ ambient):
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    ~{lowerBoundPm25} – {upperBoundPm25} µg/m³
                  </span>
                </div>
              )}
              <div className="mt-2 text-[10px] text-amber-900/90 dark:text-amber-300/80">
                <strong>Model Sensitivity Disclosure:</strong> Actual indoor levels vary drastically based on building envelope tightness, door undercuts, cross-ventilation, and indoor combustion sources. Real indoor concentrations cannot be verified without physical in-room monitoring.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
