"use client";

import React, { useSyncExternalStore } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { HourlyForecastPoint } from "@/lib/telemetry/types";

interface ForecastChartProps {
  readonly hourly: readonly HourlyForecastPoint[];
}

const emptySubscribe = (): (() => void) => () => {};

export function ForecastChart({ hourly }: ForecastChartProps): React.JSX.Element {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const chartData = hourly.slice(0, 24).map((pt) => {
    const d = new Date(pt.time);
    const hourLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return {
      time: hourLabel,
      pm2_5: pt.pm2_5,
      pm10: pt.pm10,
      temp: pt.temperatureC,
    };
  });

  return (
    <section
      aria-labelledby="forecast-heading"
      className="mt-8 rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-teal-700 dark:text-cyan-400">
            Predictive Model Trajectory
          </span>
          <h2
            id="forecast-heading"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            24-Hour Particulate & Temperature Forecast
          </h2>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Resolution: 1-Hour Step Intervals
        </div>
      </div>

      <div className="mt-6 h-72 w-full" data-testid="forecast-chart-container">
        {!isMounted ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            Rendering forecast projection...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={280} initialDimension={{ width: 600, height: 288 }}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPm10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit=" µg"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#F8FAFC",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: "12px",
                  paddingTop: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="pm2_5"
                name="PM2.5 (µg/m³)"
                stroke="#0D9488"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPm25)"
              />
              <Area
                type="monotone"
                dataKey="pm10"
                name="PM10 (µg/m³)"
                stroke="#F59E0B"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPm10)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
