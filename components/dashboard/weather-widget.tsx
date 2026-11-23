import React from "react";
import type { WeatherCondition } from "@/lib/telemetry/types";
import { Thermometer, Droplets, Wind, Gauge, Compass } from "lucide-react";

interface WeatherWidgetProps {
  readonly weather: WeatherCondition;
}

export function WeatherWidget({ weather }: WeatherWidgetProps): React.JSX.Element {
  return (
    <section
      aria-labelledby="weather-heading"
      className="mt-8 rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-teal-700 dark:text-cyan-400">
            Meteorological Drivers
          </span>
          <h2
            id="weather-heading"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Surface Weather & Atmospheric Dispersion
          </h2>
        </div>
        <div className="rounded-xl border border-teal-200/70 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-800 dark:border-teal-900/60 dark:bg-slate-800 dark:text-cyan-300">
          Condition: {weather.weatherLabel}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Temperature */}
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Thermometer className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <span>Temperature</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {weather.temperatureC}°C
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            Feels like {weather.apparentTemperatureC}°C
          </div>
        </div>

        {/* Relative Humidity */}
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Droplets className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <span>Humidity</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {weather.relativeHumidityPercent}%
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            {weather.relativeHumidityPercent > 70 ? "High (Traps Smog)" : "Moderate / Dry"}
          </div>
        </div>

        {/* Wind Speed */}
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Wind className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <span>Wind Speed</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {weather.windSpeedKmH} <span className="text-sm font-medium">km/h</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            {weather.windSpeedKmH < 6 ? "Calm / Stagnant Air" : "Active Dispersion"}
          </div>
        </div>

        {/* Wind Direction */}
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Compass className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <span>Wind Vector</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {weather.windDirectionDegrees}°
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Surface azimuth</div>
        </div>

        {/* Barometric Pressure */}
        <div className="col-span-2 rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 sm:col-span-1 dark:border-slate-800/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Gauge className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
            <span>Pressure</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {weather.surfacePressureHPa} <span className="text-sm font-medium">hPa</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Atmospheric pressure</div>
        </div>
      </div>
    </section>
  );
}
