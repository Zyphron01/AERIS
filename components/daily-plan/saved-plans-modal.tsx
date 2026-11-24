"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSavedPlansFromCloud, deleteSavedPlanFromCloud } from "@/lib/supabase/repository";
import type { Database } from "@/lib/supabase/types";
import { X, Trash2, Calendar, MapPin, Wind, Sparkles, AlertCircle } from "lucide-react";

interface SavedPlansModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

type SavedPlanRow = Database["public"]["Tables"]["saved_plans"]["Row"];

export function SavedPlansModal({
  isOpen,
  onClose,
}: SavedPlansModalProps): React.JSX.Element | null {
  const [plans, setPlans] = useState<SavedPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadPlans = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const client = getSupabaseBrowserClient();
      if (!client) {
        setErrorMessage("Supabase client is not available.");
        setIsLoading(false);
        return;
      }

      const res = await getSavedPlansFromCloud(client);
      if (res.success && res.data) {
        setPlans(res.data);
      } else {
        setErrorMessage(res.error || "Failed to retrieve saved plans.");
      }
      setIsLoading(false);
    };

    loadPlans();
  }, [isOpen]);

  // Keyboard accessibility: ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDelete = async (planId: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    setDeletingId(planId);
    const res = await deleteSavedPlanFromCloud(client, planId);
    if (res.success) {
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } else {
      alert(`Could not delete plan: ${res.error}`);
    }
    setDeletingId(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-plans-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-cyan-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2
                id="saved-plans-modal-title"
                className="text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                Cloud-Saved Action Plans
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Synchronized across your devices via Supabase PostgreSQL RLS.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-4">
          {isLoading && (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent dark:border-cyan-400"></div>
              <p className="mt-2 font-medium">Loading saved plans from PostgreSQL...</p>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load plans</p>
                <p className="mt-0.5 opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {!isLoading && !errorMessage && plans.length === 0 && (
            <div className="py-12 text-center">
              <Wind className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                No saved action plans found.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Click &quot;Save Plan to Cloud&quot; on the Daily Plan page to preserve today&apos;s recommendations.
              </p>
            </div>
          )}

          {!isLoading &&
            plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 transition dark:border-slate-800 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {plan.title}
                    </h3>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-semibold text-teal-800 dark:bg-teal-950 dark:text-cyan-300">
                      AQI {plan.estimated_cpcb_aqi} • {plan.cpcb_category}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {plan.location_name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {plan.plan_date}
                    </span>
                    <span>
                      {plan.actions_count} {plan.actions_count === 1 ? "action" : "actions"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    disabled={deletingId === plan.id}
                    aria-label={`Delete saved plan for ${plan.location_name}`}
                    className="relative z-10 inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 shadow-2xs transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{deletingId === plan.id ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200/80 px-6 py-3 text-right dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
