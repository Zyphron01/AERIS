"use client";

import React, { useState } from "react";
import type {
  HouseholdProfile,
  HouseholdMemberType,
  DeclaredSensitivityType,
  CommuteMode,
  OutdoorExerciseTiming,
  FiltrationType,
  VentilationPreference,
  IndoorSourceType,
  BudgetPreference,
} from "@/lib/decision-engine/types";
import { Shield, X, Check, ArrowRight, ArrowLeft } from "lucide-react";

interface OnboardingWizardProps {
  readonly initialProfile?: HouseholdProfile | null;
  readonly onSave: (profile: HouseholdProfile) => void;
  readonly onCancel?: () => void;
}

export function OnboardingWizard({
  initialProfile,
  onSave,
  onCancel,
}: OnboardingWizardProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Members & Considerations
  const [members, setMembers] = useState<HouseholdMemberType[]>(
    initialProfile?.members ? [...initialProfile.members] : ["adults"]
  );
  const [declaredSensitivity, setDeclaredSensitivity] = useState<DeclaredSensitivityType>(
    initialProfile?.declaredSensitivity ?? "none"
  );

  // Step 2: Daily Activity & Commute
  const [primaryCommute, setPrimaryCommute] = useState<CommuteMode>(
    initialProfile?.primaryCommute ?? "public_transit"
  );
  const [outdoorExercise, setOutdoorExercise] = useState<OutdoorExerciseTiming>(
    initialProfile?.outdoorExercise ?? "early_morning"
  );
  const [hasSchoolRoutine, setHasSchoolRoutine] = useState<boolean>(
    initialProfile?.hasSchoolRoutine ?? false
  );

  // Step 3: Indoor Environment
  const [filtration, setFiltration] = useState<FiltrationType>(
    initialProfile?.filtration ?? "none"
  );
  const [ventilationPreference, setVentilationPreference] = useState<VentilationPreference>(
    initialProfile?.ventilationPreference ?? "natural_windows"
  );
  const [indoorSources, setIndoorSources] = useState<IndoorSourceType[]>(
    initialProfile?.indoorSources ? [...initialProfile.indoorSources] : ["cooking_fumes"]
  );

  // Step 4: Budget & Practicality
  const [budgetPreference, setBudgetPreference] = useState<BudgetPreference>(
    initialProfile?.budgetPreference ?? "no_cost"
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  // Toggle member
  const handleToggleMember = (m: HouseholdMemberType) => {
    setMembers((prev) => {
      if (prev.includes(m)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((item) => item !== m);
      }
      return [...prev, m];
    });
  };

  // Toggle indoor source
  const handleToggleSource = (s: IndoorSourceType) => {
    setIndoorSources((prev) => {
      if (s === "none") return ["none"];
      const withoutNone = prev.filter((item) => item !== "none");
      if (withoutNone.includes(s)) {
        const next = withoutNone.filter((item) => item !== s);
        return next.length === 0 ? ["none"] : next;
      }
      return [...withoutNone, s];
    });
  };

  const handleNext = () => {
    if (step === 1 && members.length === 0) {
      setValidationError("Please select at least one household member group.");
      return;
    }
    setValidationError(null);
    if (step < 4) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleComplete = () => {
    if (members.length === 0) {
      setValidationError("Please select at least one household member group.");
      setStep(1);
      return;
    }

    const newProfile: HouseholdProfile = {
      id: initialProfile?.id ?? `profile-${Date.now()}`,
      members,
      declaredSensitivity,
      primaryCommute,
      outdoorExercise,
      hasSchoolRoutine,
      filtration,
      ventilationPreference,
      indoorSources,
      budgetPreference,
      updatedAt: new Date().toISOString(),
    };

    onSave(newProfile);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      className="relative w-full max-w-2xl rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8"
    >
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="text-[11px] font-semibold tracking-wider text-teal-600 uppercase dark:text-cyan-400">
            Step {step} of 4 — {step === 1 ? "Household" : step === 2 ? "Routines" : step === 3 ? "Indoor Setup" : "Budget"}
          </div>
          <h2 id="wizard-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {step === 1 && "Who is in your household?"}
            {step === 2 && "What are your daily movement patterns?"}
            {step === 3 && "What does your indoor environment look like?"}
            {step === 4 && "What is your practical budget for interventions?"}
          </h2>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close setup wizard"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-teal-600 transition-all duration-300 dark:bg-cyan-400"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {validationError && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {validationError}
        </div>
      )}

      {/* Step Content */}
      <div className="mt-6 min-h-[320px]">
        {/* Step 1: Household Members */}
        {step === 1 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Household Demographics (Select all that apply)
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { id: "adults", label: "Adults (18–64)" },
                  { id: "children", label: "Children (2–17)" },
                  { id: "older_adults", label: "Seniors (65+)" },
                  { id: "infants", label: "Infants (<2 yrs)" },
                ].map((item) => {
                  const isChecked = members.includes(item.id as HouseholdMemberType);
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 text-xs font-medium transition ${
                        isChecked
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMember(item.id as HouseholdMemberType)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. User-Declared Sensitivity (Optional, Strictly Non-Diagnostic)
              </legend>
              <div className="mt-3 space-y-2">
                {[
                  { id: "none", title: "General Population (Standard)", desc: "No known specific respiratory or cardiovascular sensitivities." },
                  { id: "respiratory_asthma", title: "Respiratory / Reactive Airways", desc: "User considers asthma, allergic rhinitis, or chronic airway sensitivity." },
                  { id: "cardiovascular", title: "Cardiovascular Consideration", desc: "User considers hypertension or heart health during physical exertion." },
                ].map((item) => {
                  const isSelected = declaredSensitivity === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-xs transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="declaredSensitivity"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setDeclaredSensitivity(item.id as DeclaredSensitivityType)}
                        className="mt-0.5 h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 2: Daily Routines & Movement */}
        {step === 2 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Primary Commute Mode
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { id: "active_walking_biking", label: "Walking / Cycling" },
                  { id: "public_transit", label: "Metro / Bus / Train" },
                  { id: "personal_vehicle", label: "Car / Motorbike" },
                  { id: "work_from_home", label: "Work from Home" },
                ].map((item) => {
                  const isSelected = primaryCommute === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-xs font-medium transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="radio"
                        name="primaryCommute"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setPrimaryCommute(item.id as CommuteMode)}
                        className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Outdoor Exercise Routine
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { id: "none", label: "None / Indoor Only" },
                  { id: "early_morning", label: "Early Morning (06:00–09:00)" },
                  { id: "afternoon", label: "Midday / Afternoon" },
                  { id: "evening", label: "Evening (17:00–21:00)" },
                ].map((item) => {
                  const isSelected = outdoorExercise === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-xs font-medium transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="radio"
                        name="outdoorExercise"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setOutdoorExercise(item.id as OutdoorExerciseTiming)}
                        className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
              <input
                type="checkbox"
                checked={hasSchoolRoutine}
                onChange={(e) => setHasSchoolRoutine(e.target.checked)}
                className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Household has daily school bus transit or student drop-off routine</span>
            </label>
          </div>
        )}

        {/* Step 3: Indoor Environment */}
        {step === 3 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Installed Air Filtration
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { id: "hepa_purifier", label: "Portable HEPA Purifier" },
                  { id: "hvac_filter", label: "Central HVAC / AC Filter" },
                  { id: "simple_fan", label: "Ceiling / Table Fan" },
                  { id: "none", label: "No Active Filtration" },
                ].map((item) => {
                  const isSelected = filtration === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-xs font-medium transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="radio"
                        name="filtration"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setFiltration(item.id as FiltrationType)}
                        className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ventilation Preference
              </legend>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { id: "natural_windows", label: "Natural Windows" },
                  { id: "mechanical", label: "Mechanical / Exhaust" },
                  { id: "minimal", label: "Minimal / Sealed" },
                ].map((item) => {
                  const isSelected = ventilationPreference === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-xs font-medium transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="radio"
                        name="ventilationPreference"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setVentilationPreference(item.id as VentilationPreference)}
                        className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Indoor Combustion & Particle Sources
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { id: "cooking_fumes", label: "Frying / Spices / Cooking" },
                  { id: "incense_candles", label: "Incense / Dhoop / Candles" },
                  { id: "pet_dander", label: "Pet Dander / Fur" },
                  { id: "smoking", label: "Indoor Smoking" },
                  { id: "none", label: "None of the Above" },
                ].map((item) => {
                  const isChecked = indoorSources.includes(item.id as IndoorSourceType);
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-xs font-medium transition ${
                        isChecked
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSource(item.id as IndoorSourceType)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 4: Budget & Practicality */}
        {step === 4 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Preferred Action Budget Tier
              </legend>
              <div className="mt-3 space-y-3">
                {[
                  {
                    id: "no_cost",
                    title: "Zero New Spending (Behavioral & Free)",
                    desc: "Focus strictly on schedule adjustments, window timing, door draft sealing, and free behavioral exposure reductions.",
                  },
                  {
                    id: "limited",
                    title: "Limited Budget (Consumables & Essentials)",
                    desc: "Open to certified particulate respirators (N95/FFP2), replacement filters, and basic weatherstripping.",
                  },
                  {
                    id: "flexible",
                    title: "Flexible Budget (Active Investment)",
                    desc: "Open to HEPA purifiers, high-efficiency mechanical filtration, and environmental monitoring hardware.",
                  },
                ].map((item) => {
                  const isSelected = budgetPreference === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-xs transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/60 text-teal-950 dark:border-teal-400 dark:bg-teal-950/40 dark:text-cyan-200"
                          : "border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="budgetPreference"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setBudgetPreference(item.id as BudgetPreference)}
                        className="mt-0.5 h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 leading-relaxed">
              <Shield className="mr-1.5 inline h-4 w-4 text-teal-600 dark:text-cyan-400" />
              <strong>Privacy Guarantee:</strong> AERIS does not collect your name, exact address, or medical history. Your profile is stored strictly in your browser and used locally to rank deterministic environmental recommendations.
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex items-center gap-3">
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-6 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              <Check className="h-4 w-4" />
              <span>Generate My Daily Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
