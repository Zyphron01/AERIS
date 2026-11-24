"use client";

import React, { useState, useSyncExternalStore, useMemo } from "react";
import { DailyPlanHeader } from "@/components/daily-plan/daily-plan-header";
import { OnboardingWizard } from "@/components/daily-plan/onboarding-wizard";
import { ProfileSummaryBar } from "@/components/daily-plan/profile-summary-bar";
import { RecommendationCard } from "@/components/daily-plan/recommendation-card";
import { DataAttributionBanner } from "@/components/dashboard/data-attribution-banner";
import {
  TelemetryLoadingState,
  TelemetryErrorState,
  StaleDataWarning,
} from "@/components/dashboard/telemetry-state-views";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import { useTelemetry } from "@/lib/telemetry/use-telemetry";
import type { LocationMetadata } from "@/lib/telemetry/types";
import type { HouseholdProfile, DailyPlanResult } from "@/lib/decision-engine/types";
import {
  saveHouseholdProfile,
  clearHouseholdProfile,
  subscribeToHouseholdProfile,
  getHouseholdProfileSnapshot,
  getHouseholdProfileServerSnapshot,
  safeParseHouseholdProfile,
} from "@/lib/decision-engine/household-profile";
import { evaluateDailyPlan } from "@/lib/decision-engine/engine";
import { AiExplanationDrawer } from "@/components/daily-plan/ai-explanation-drawer";
import type { RecommendationAction } from "@/lib/decision-engine/types";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSupabaseUser } from "@/lib/supabase/use-supabase-user";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { savePlanToCloud } from "@/lib/supabase/repository";
import { AuthModal } from "@/components/auth/auth-modal";
import { SavedPlansModal } from "@/components/daily-plan/saved-plans-modal";
import { useTheme } from "@/components/theme/theme-provider";

export default function DailyPlanPage(): React.JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<LocationMetadata>(DEFAULT_LOCATION);
  const { telemetry, isLoading, error, refetch } = useTelemetry(selectedLocation.id);
  const { theme, toggleTheme } = useTheme();

  // Cloud Persistence & Auth State
  const { user } = useSupabaseUser();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSavedPlansOpen, setIsSavedPlansOpen] = useState<boolean>(false);
  const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);
  const [planSavedSuccess, setPlanSavedSuccess] = useState<boolean>(false);

  // Household Profile State via useSyncExternalStore (SSR-safe, reactive across tabs and local actions)
  const rawProfile = useSyncExternalStore(
    subscribeToHouseholdProfile,
    getHouseholdProfileSnapshot,
    getHouseholdProfileServerSnapshot
  );

  const profile = useMemo(() => {
    return safeParseHouseholdProfile(rawProfile);
  }, [rawProfile]);

  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [aiDrawerAction, setAiDrawerAction] = useState<RecommendationAction | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);

  // Profile Save Handler
  const handleSaveProfile = (newProfile: HouseholdProfile) => {
    const res = saveHouseholdProfile(newProfile);
    if (res.success) {
      setIsWizardOpen(false);
    }
  };

  // Profile Clear Handler
  const handleClearProfile = () => {
    clearHouseholdProfile();
  };

  // Evaluate Daily Plan
  const planResult: DailyPlanResult | null =
    profile && telemetry ? evaluateDailyPlan(profile, telemetry) : null;

  // Cloud Save Plan Handler
  const handleSavePlan = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!telemetry || !planResult) {
      alert("Please wait for telemetry and action plan to load before saving.");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      alert("Supabase client is not available.");
      return;
    }

    setIsSavingPlan(true);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const res = await savePlanToCloud(client, {
      title: `Action Plan for ${selectedLocation.name}`,
      planDate: dateStr,
      locationName: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      primaryPollutant: telemetry.aqi.cpcbAqi.dominantPollutant || "pm2_5",
      estimatedCpcbAqi: telemetry.aqi.cpcbAqi.value ?? 0,
      cpcbCategory: telemetry.aqi.cpcbAqi.category || "Moderate",
      actionsCount: planResult.rankedActions.length,
      planPayload: {
        summary: planResult.summary,
        actions: planResult.rankedActions,
        generatedAt: now.toISOString(),
        location: selectedLocation,
      },
      schemaVersion: 1,
    });

    setIsSavingPlan(false);
    if (res.success) {
      setPlanSavedSuccess(true);
      setTimeout(() => setPlanSavedSuccess(false), 2500);
    } else {
      alert(`Could not save plan: ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <DailyPlanHeader
        selectedLocation={selectedLocation}
        onLocationChange={(loc) => setSelectedLocation(loc)}
        freshness={telemetry?.freshness ?? "fresh"}
        freshnessExplanation={telemetry?.freshnessExplanation ?? "Fresh telemetry received."}
        hasProfile={profile !== null}
        onEditProfile={() => setIsWizardOpen(true)}
        theme={theme}
        onThemeToggle={toggleTheme}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSavedPlans={() => setIsSavedPlansOpen(true)}
        onSavePlan={handleSavePlan}
        isSavingPlan={isSavingPlan}
        planSavedSuccess={planSavedSuccess}
      />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-6 py-8 focus:outline-none">
        {/* Stale Warning Banner */}
        {telemetry && (telemetry.freshness === "stale" || telemetry.freshness === "outdated") && (
          <StaleDataWarning lastUpdated={telemetry.timestamp} />
        )}

        {/* Loading State */}
        {isLoading && <TelemetryLoadingState />}

        {/* Error State */}
        {!isLoading && error && (
          <TelemetryErrorState
            errorMessage={error}
            onRetry={() => {
              void refetch();
            }}
          />
        )}

        {/* Onboarding Wizard Modal */}
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <OnboardingWizard
              initialProfile={profile}
              onSave={handleSaveProfile}
              onCancel={() => setIsWizardOpen(false)}
            />
          </div>
        )}

        {/* Loaded State */}
        {!isLoading && !error && telemetry && (
          <div className="space-y-8">
            {/* Active Profile Bar OR Empty Profile Callout */}
            {profile ? (
              <ProfileSummaryBar
                profile={profile}
                onEdit={() => setIsWizardOpen(true)}
                onClear={handleClearProfile}
              />
            ) : (
              <div className="rounded-3xl border border-teal-200/90 bg-white/80 p-8 shadow-sm backdrop-blur-md dark:border-teal-900/60 dark:bg-slate-900/70 sm:p-10">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold tracking-wider text-teal-700 uppercase dark:text-cyan-400">
                      Onboarding Step
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                    Personalize your daily air-quality decisions.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    AERIS adapts environmental advice to your specific household demographics, daily commute, workout timing, and home filtration setup. Complete a short, 4-step setup stored securely and entirely within your browser.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-teal-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                    >
                      <span>Set Up Household Profile</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Takes ~60 seconds • No account required
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Environmental Snapshot Bar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/50 p-4 text-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedLocation.name} Ambient Context:
                  </span>
                  <span>
                    CPCB AQI:{" "}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {telemetry.aqi.cpcbAqi.value !== null
                        ? `${telemetry.aqi.cpcbAqi.value} (${telemetry.aqi.cpcbAqi.category})`
                        : "Estimate Unavailable"}
                    </strong>
                  </span>
                  <span>
                    PM2.5:{" "}
                    <strong>
                      {telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? "—"} µg/m³
                    </strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Observation: {new Date(telemetry.timestamp).toLocaleTimeString()} ({telemetry.dataKind})
                </div>
              </div>
            </div>

            {/* Executive Plan Summary */}
            {planResult && (
              <div className="rounded-2xl border border-slate-200/90 bg-white/70 p-6 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Today&apos;s Environmental Strategy
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {planResult.summary}
                </p>
              </div>
            )}

            {/* Ranked Recommendations List */}
            {planResult && planResult.rankedActions.length > 0 && (
              <section aria-labelledby="recommendations-heading" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2
                      id="recommendations-heading"
                      className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
                    >
                      Top Ranked Action Plan
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Prioritized by acute exposure risk, vulnerability relevance, and domain diversity.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {planResult.rankedActions.map((action, idx) => (
                    <RecommendationCard
                      key={action.id}
                      action={action}
                      rank={idx + 1}
                      onExplainAi={(selectedAction) => {
                        setAiDrawerAction(selectedAction);
                        setIsAiDrawerOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Bottom Attribution */}
            <DataAttributionBanner telemetry={telemetry} />
          </div>
        )}

        {/* AI Explanation Drawer */}
        {profile && isAiDrawerOpen && (
          <AiExplanationDrawer
            isOpen={isAiDrawerOpen}
            onClose={() => setIsAiDrawerOpen(false)}
            action={aiDrawerAction}
            profile={profile}
            locationId={selectedLocation.id}
          />
        )}

        {/* Cloud Authentication Modal */}
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            currentUser={user}
            onAuthSuccess={() => {
              if (telemetry && planResult) {
                handleSavePlan();
              }
            }}
          />
        )}

        {/* Cloud-Saved Plans Modal */}
        {isSavedPlansOpen && (
          <SavedPlansModal
            isOpen={isSavedPlansOpen}
            onClose={() => setIsSavedPlansOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
