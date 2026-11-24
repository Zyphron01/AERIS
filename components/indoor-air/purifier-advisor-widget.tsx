"use client";

import React, { useState, useMemo } from "react";
import type {
  RoomDimensions,
  ExistingPurifierSpecs,
  CostParameters,
  DimensionUnit,
  CurrencyUnit,
} from "@/lib/indoor-air/types";
import { computePurifierAdvisor, FEET_PER_METER } from "@/lib/indoor-air/calculations";
import { Calculator, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign, Info } from "lucide-react";

interface PurifierAdvisorWidgetProps {
  readonly outdoorPm25: number | null;
  readonly budgetPreference?: "no_cost" | "limited" | "flexible";
}

export function PurifierAdvisorWidget({
  outdoorPm25,
  budgetPreference = "limited",
}: PurifierAdvisorWidgetProps): React.JSX.Element {
  // Dimension state (defaults: 4m x 3.5m x 2.44m / ~14 m² bedroom)
  const [length, setLength] = useState<number>(4.0);
  const [width, setWidth] = useState<number>(3.5);
  const [height, setHeight] = useState<number>(2.44);
  const [unit, setUnit] = useState<DimensionUnit>("meters");

  // Existing purifier state
  const [hasPurifier, setHasPurifier] = useState<boolean>(false);
  const [knownCadrM3h, setKnownCadrM3h] = useState<number | null>(null);
  const [dailyHours] = useState<number>(8);

  // Cost parameters state
  const [currency, setCurrency] = useState<CurrencyUnit>("INR");
  const [tariff, setTariff] = useState<number>(8.0); // ₹8 / kWh default
  const [filterCost, setFilterCost] = useState<number>(2500); // ₹2,500 / yr default

  // Unit toggle handler with exact conversion
  const handleUnitToggle = (newUnit: DimensionUnit) => {
    if (newUnit === unit) return;
    if (newUnit === "feet") {
      setLength(Math.round(length * FEET_PER_METER * 10) / 10);
      setWidth(Math.round(width * FEET_PER_METER * 10) / 10);
      setHeight(Math.round(height * FEET_PER_METER * 10) / 10);
    } else {
      setLength(Math.round((length / FEET_PER_METER) * 100) / 100);
      setWidth(Math.round((width / FEET_PER_METER) * 100) / 100);
      setHeight(Math.round((height / FEET_PER_METER) * 100) / 100);
    }
    setUnit(newUnit);
  };

  // Currency toggle handler
  const handleCurrencyToggle = (newCurrency: CurrencyUnit) => {
    if (newCurrency === currency) return;
    if (newCurrency === "USD") {
      setTariff(0.16); // $0.16 / kWh US avg
      setFilterCost(40); // $40 / yr US avg
    } else {
      setTariff(8.0); // ₹8.0 / kWh India avg
      setFilterCost(2500); // ₹2,500 / yr India avg
    }
    setCurrency(newCurrency);
  };

  const dimensions: RoomDimensions = useMemo(
    () => ({
      length: Math.max(1, length),
      width: Math.max(1, width),
      height: Math.max(1.8, height),
      unit,
    }),
    [length, width, height, unit]
  );

  const purifierSpecs: ExistingPurifierSpecs = useMemo(
    () => ({
      hasPurifier,
      knownCadrM3h,
      knownCadrCfm: null,
      dailyOperatingHours: dailyHours,
      ratedWattage: null,
    }),
    [hasPurifier, knownCadrM3h, dailyHours]
  );

  const costParams: CostParameters = useMemo(
    () => ({
      electricityTariffPerKwh: tariff,
      annualFilterReplacementCost: filterCost,
      currency,
    }),
    [tariff, filterCost, currency]
  );

  // Compute sizing and costs
  const advisor = useMemo(
    () =>
      computePurifierAdvisor(
        dimensions,
        purifierSpecs,
        costParams,
        outdoorPm25,
        budgetPreference
      ),
    [dimensions, purifierSpecs, costParams, outdoorPm25, budgetPreference]
  );

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white/70 p-6 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60 sm:p-8">
      {/* Header & Unit Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
            <Calculator className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Budget-Aware Purifier Sizing & Cost Advisor
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Transparent AHAM AC-1 / EPA 2/3 calculations with zero invented specifications
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dimension Unit Toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleUnitToggle("meters")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                unit === "meters"
                  ? "bg-white text-teal-800 shadow-xs dark:bg-slate-700 dark:text-cyan-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Meters (m)
            </button>
            <button
              type="button"
              onClick={() => handleUnitToggle("feet")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                unit === "feet"
                  ? "bg-white text-teal-800 shadow-xs dark:bg-slate-700 dark:text-cyan-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Feet (ft)
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleCurrencyToggle("INR")}
              className={`rounded-lg px-2 py-1 font-semibold transition ${
                currency === "INR"
                  ? "bg-white text-teal-800 shadow-xs dark:bg-slate-700 dark:text-cyan-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              ₹ INR
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyToggle("USD")}
              className={`rounded-lg px-2 py-1 font-semibold transition ${
                currency === "USD"
                  ? "bg-white text-teal-800 shadow-xs dark:bg-slate-700 dark:text-cyan-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      {/* Input Form Controls */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="room-length-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Room Length ({unit === "meters" ? "m" : "ft"})
          </label>
          <input
            id="room-length-input"
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="room-width-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Room Width ({unit === "meters" ? "m" : "ft"})
          </label>
          <input
            id="room-width-input"
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="room-height-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Ceiling Height ({unit === "meters" ? "m" : "ft"})
          </label>
          <input
            id="room-height-input"
            type="number"
            min="1.8"
            max="10"
            step="0.1"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Existing Purifier Checker */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={hasPurifier}
              onChange={(e) => setHasPurifier(e.target.checked)}
              className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>I already own an air purifier in this room</span>
          </label>

          {hasPurifier && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">CADR (m³/h):</span>
              <input
                type="number"
                placeholder="e.g. 250"
                value={knownCadrM3h ?? ""}
                onChange={(e) =>
                  setKnownCadrM3h(e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Existing Purifier Evaluation Banner */}
        {hasPurifier && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs ${
              advisor.existingPurifierEvaluation.status === "adequate"
                ? "border border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : advisor.existingPurifierEvaluation.status === "marginal"
                ? "border border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : "border border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            {advisor.existingPurifierEvaluation.status === "adequate" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <strong className="capitalize">
                {advisor.existingPurifierEvaluation.status} Purifier Capacity:
              </strong>{" "}
              {advisor.existingPurifierEvaluation.assessment}
            </div>
          </div>
        )}
      </div>

      {/* Sizing Calculations Grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/40">
          <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Room Volume
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {advisor.roomVolumeCuM} m³
          </span>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400">
            ({advisor.roomVolumeCuFt} cu ft)
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/40">
          <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Target Clean Air Rate
          </span>
          <span className="text-xl font-extrabold tracking-tight text-teal-700 dark:text-cyan-400">
            {advisor.targetAch} ACH
          </span>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400">EPA / AHAM Standard</span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/40">
          <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Recommended CADR
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {advisor.recommendedCadrM3h} m³/h
          </span>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400">
            ({advisor.recommendedCadrCfm} CFM)
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-800/40">
          <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
            EPA 2/3 Benchmark
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {advisor.epaTwoThirdsRuleCfm} CFM
          </span>
          <span className="block text-[10px] text-slate-500 dark:text-slate-400">Smoke / Fine Particles</span>
        </div>
      </div>

      {/* Recommendation & Zero-Cost Alternative Card */}
      <div
        className={`mt-6 rounded-2xl border p-5 ${
          !advisor.isNewPurifierPurchaseRecommended
            ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            : "border-teal-200 bg-teal-50/70 dark:border-teal-900/60 dark:bg-teal-950/30"
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-700 dark:text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Purifier Sizing Recommendation
          </h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {advisor.recommendationReason}
        </p>

        {advisor.zeroCostAlternativeAvailable && (
          <div className="mt-3 border-t border-teal-200/60 pt-3 text-xs text-teal-900 dark:border-teal-800/60 dark:text-cyan-200">
            <strong>Zero-Cost Alternative:</strong> If you prefer not to purchase equipment,
            prioritize localized exhaust over cooking, wet-mop with microfiber cloths, and seal door
            thresholds with rolled towels to achieve meaningful particle reduction at zero cost.
          </div>
        )}
      </div>

      {/* Total Cost of Ownership (TCO) Calculator */}
      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Estimated Total Cost of Ownership (TCO)
            </h3>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Operating: {dailyHours} hrs/day • Motor: ~{advisor.operatingCost.estimatedPowerWatts}W
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="block text-[10px] text-slate-400">Tariff Rate</span>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {currency === "INR" ? "₹" : "$"}
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={tariff}
                onChange={(e) => setTariff(Number(e.target.value))}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-400">/kWh</span>
            </div>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400">Annual Filter Cost</span>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {currency === "INR" ? "₹" : "$"}
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={filterCost}
                onChange={(e) => setFilterCost(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400">Annual Electricity</span>
            <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-slate-100">
              {currency === "INR" ? "₹" : "$"}
              {advisor.operatingCost.annualElectricityCost}
            </span>
            <span className="block text-[10px] text-slate-400">
              ({advisor.operatingCost.annualKwh} kWh/yr)
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400">Total Annual Operating</span>
            <span className="mt-1 block text-sm font-extrabold text-teal-700 dark:text-cyan-400">
              {currency === "INR" ? "₹" : "$"}
              {advisor.operatingCost.totalAnnualCost} / yr
            </span>
            <span className="block text-[10px] text-slate-400">
              (~{currency === "INR" ? "₹" : "$"}{advisor.operatingCost.monthlyCost} / mo)
            </span>
          </div>
        </div>
      </div>

      {/* Scientific Transparency Disclaimers */}
      <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          <span>Scientific & Performance Disclaimers:</span>
        </div>
        <ul className="mt-1.5 list-inside list-disc space-y-1">
          {advisor.scientificDisclaimers.map((disc, idx) => (
            <li key={idx}>{disc}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
