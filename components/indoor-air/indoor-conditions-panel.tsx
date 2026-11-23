"use client";

import React, { useState } from "react";
import type {
  UserReportedIndoorConditions,
  OptionalIndoorSensors,
  RoomType,
  WindowState,
  IndoorCombustionSource,
  PerceivedStuffiness,
  ThermalComfort,
} from "@/lib/indoor-air/types";
import { Sliders, Flame, ChevronDown, ChevronUp } from "lucide-react";

interface IndoorConditionsPanelProps {
  readonly conditions: UserReportedIndoorConditions;
  readonly onConditionsChange: (newConditions: UserReportedIndoorConditions) => void;
  readonly sensors: OptionalIndoorSensors | null;
  readonly onSensorsChange: (sensors: OptionalIndoorSensors | null) => void;
}

export function IndoorConditionsPanel({
  conditions,
  onConditionsChange,
  sensors,
  onSensorsChange,
}: IndoorConditionsPanelProps): React.JSX.Element {
  const [showSensorInputs, setShowSensorInputs] = useState<boolean>(sensors !== null);

  const roomTypes: { id: RoomType; label: string }[] = [
    { id: "bedroom", label: "Bedroom" },
    { id: "living_room", label: "Living Room" },
    { id: "kitchen", label: "Kitchen" },
    { id: "home_office", label: "Home Office" },
    { id: "nursery", label: "Nursery / Child Room" },
  ];

  const windowStates: { id: WindowState; label: string }[] = [
    { id: "all_closed", label: "Firmly Closed" },
    { id: "cracked_open", label: "Cracked (1-2 in)" },
    { id: "wide_open", label: "Wide Open" },
  ];

  const thermalStates: { id: ThermalComfort; label: string }[] = [
    { id: "comfortable", label: "Comfortable" },
    { id: "too_hot", label: "Too Hot (Heat Stress Risk)" },
    { id: "too_cold", label: "Too Cold" },
  ];

  const stuffinessStates: { id: PerceivedStuffiness; label: string }[] = [
    { id: "fresh", label: "Fresh" },
    { id: "normal", label: "Normal" },
    { id: "stuffy_drowsy", label: "Stuffy / Drowsy (CO2)" },
    { id: "odorous", label: "Noticeable Odor / Smoke" },
  ];

  const combustionOptions: { id: IndoorCombustionSource; label: string }[] = [
    { id: "cooking_unvented", label: "Frying / High-Heat Cooking" },
    { id: "gas_stove", label: "Unvented Gas Stove" },
    { id: "incense_candles", label: "Incense / Scented Candles" },
    { id: "smoking", label: "Tobacco Smoke" },
    { id: "none", label: "No Active Combustion" },
  ];

  const toggleCombustion = (src: IndoorCombustionSource) => {
    if (src === "none") {
      onConditionsChange({ ...conditions, combustionSources: ["none"] });
      return;
    }
    const current = conditions.combustionSources.filter((s) => s !== "none");
    const updated = current.includes(src)
      ? current.filter((s) => s !== src)
      : [...current, src];

    onConditionsChange({
      ...conditions,
      combustionSources: updated.length > 0 ? updated : ["none"],
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white/70 p-6 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
          <Sliders className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Room & Behavioral Setup
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Tailor ventilation, source mitigation, and clean air delivery to your active room state.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Room Type */}
        <div>
          <label htmlFor="room-type-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Active Room Type
          </label>
          <select
            id="room-type-select"
            value={conditions.roomType}
            onChange={(e) =>
              onConditionsChange({ ...conditions, roomType: e.target.value as RoomType })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {roomTypes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Window State */}
        <div>
          <label htmlFor="window-state-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Window & Exterior Openings
          </label>
          <select
            id="window-state-select"
            value={conditions.windowState}
            onChange={(e) =>
              onConditionsChange({ ...conditions, windowState: e.target.value as WindowState })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {windowStates.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        {/* Thermal Comfort / Heat Stress Risk */}
        <div>
          <label htmlFor="thermal-sensation-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Thermal Sensation
          </label>
          <select
            id="thermal-sensation-select"
            value={conditions.thermalComfort}
            onChange={(e) =>
              onConditionsChange({
                ...conditions,
                thermalComfort: e.target.value as ThermalComfort,
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {thermalStates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stuffiness / CO2 Perception */}
        <div>
          <label htmlFor="stuffiness-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Indoor Air Freshness / CO2
          </label>
          <select
            id="stuffiness-select"
            value={conditions.perceivedStuffiness}
            onChange={(e) =>
              onConditionsChange({
                ...conditions,
                perceivedStuffiness: e.target.value as PerceivedStuffiness,
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {stuffinessStates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Appliances */}
        <div className="flex flex-col justify-end space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={conditions.hasExhaustFanRunning}
              onChange={(e) =>
                onConditionsChange({ ...conditions, hasExhaustFanRunning: e.target.checked })
              }
              className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Kitchen/Bath Exhaust Fan Running</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={conditions.hasAirConditionerRunning}
              onChange={(e) =>
                onConditionsChange({ ...conditions, hasAirConditionerRunning: e.target.checked })
              }
              className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Air Conditioner (AC) Running</span>
          </label>
        </div>
      </div>

      {/* Active Combustion Sources */}
      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <span>Active Indoor Combustion Sources</span>
        </label>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {combustionOptions.map((c) => {
            const isSelected = conditions.combustionSources.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCombustion(c.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Physical Sensor Disclosure Toggle */}
      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            if (showSensorInputs) {
              onSensorsChange(null);
              setShowSensorInputs(false);
            } else {
              setShowSensorInputs(true);
              onSensorsChange({
                pm25Value: 35,
                co2Ppm: 800,
                temperatureC: 24,
                humidityPercent: 50,
                deviceLabel: "Physical Air Monitor",
              });
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          <span>
            {showSensorInputs
              ? "− Remove Physical Indoor Sensor Readings"
              : "+ I have a physical indoor air quality monitor (Qingping, Temtop, AirGradient, etc.)"}
          </span>
          {showSensorInputs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showSensorInputs && sensors && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-4 sm:grid-cols-3 dark:border-teal-900/60 dark:bg-teal-950/20">
            <div>
              <label htmlFor="sensor-pm25-input" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Measured PM2.5 (µg/m³)
              </label>
              <input
                id="sensor-pm25-input"
                type="number"
                min="0"
                value={sensors.pm25Value ?? ""}
                onChange={(e) =>
                  onSensorsChange({
                    ...sensors,
                    pm25Value: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="sensor-co2-input" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                CO2 (ppm, optional)
              </label>
              <input
                id="sensor-co2-input"
                type="number"
                min="300"
                value={sensors.co2Ppm ?? ""}
                onChange={(e) =>
                  onSensorsChange({
                    ...sensors,
                    co2Ppm: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="e.g. 750"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="sensor-device-label-input" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Device Model / Brand
              </label>
              <input
                id="sensor-device-label-input"
                type="text"
                value={sensors.deviceLabel ?? ""}
                onChange={(e) =>
                  onSensorsChange({
                    ...sensors,
                    deviceLabel: e.target.value,
                  })
                }
                placeholder="e.g. Qingping Lite"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
