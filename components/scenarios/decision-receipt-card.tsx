"use client";

import React, { useState } from "react";
import type { ScenarioComparisonResult } from "@/lib/scenarios/types";
import { Receipt, Copy, Check, ShieldAlert, ArrowRight, CheckCircle2, CloudUpload, BookmarkCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveDecisionReceiptToCloud } from "@/lib/supabase/repository";
import { useSupabaseUser } from "@/lib/supabase/use-supabase-user";
import { AuthModal } from "@/components/auth/auth-modal";

interface DecisionReceiptCardProps {
  readonly result: ScenarioComparisonResult;
}

export function DecisionReceiptCard({
  result,
}: DecisionReceiptCardProps): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useSupabaseUser();
  const { receipt, baseline, alternative, delta } = result;

  const handleSaveToCloud = async (): Promise<void> => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      alert("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    const res = await saveDecisionReceiptToCloud(client, {
      receiptId: receipt.receiptId,
      scenarioId: receipt.applicableRuleId,
      scenarioLabel: receipt.ruleTitle,
      timingSlot: receipt.forecastFreshness,
      actionType: receipt.scenarioType,
      cpcbAqiBand: baseline.forecastedAqiCategory || "Moderate",
      hourlyPm25Estimate: baseline.forecastedPm25 ?? 0,
      mitigationSteps: [...receipt.assumptions],
    });

    setIsSaving(false);
    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      alert(`Could not save receipt: ${res.error}`);
    }
  };

  const handleCopy = async (): Promise<void> => {
    const textToCopy = `
AERIS DETERMINISTIC DECISION RECEIPT
====================================
Receipt ID: ${receipt.receiptId}
Generated At: ${new Date(receipt.generatedAt).toLocaleString()}
Location: ${receipt.locationName}
Data Source: ${receipt.dataSource}
Forecast Freshness: ${receipt.forecastFreshness}
Scenario: ${receipt.scenarioType}

BASELINE:
- ${baseline.label}
- ${baseline.description}
${baseline.forecastedPm25 !== null ? `- Forecasted Ambient: ${baseline.forecastedPm25} µg/m³ PM2.5 (${baseline.forecastedAqiCategory})` : ""}

ALTERNATIVE:
- ${alternative.label}
- ${alternative.description}
${alternative.forecastedPm25 !== null ? `- Forecasted Ambient: ${alternative.forecastedPm25} µg/m³ PM2.5 (${alternative.forecastedAqiCategory})` : ""}

ENVIRONMENTAL COMPARISON:
${delta.summaryText}

DETERMINISTIC RULE:
- Rule: ${receipt.ruleTitle} (${receipt.applicableRuleId})
- Finding: ${receipt.primaryFinding}
- Trade-Offs: ${receipt.tradeOffs}

ASSUMPTIONS:
${receipt.assumptions.map((a) => `- ${a}`).join("\n")}

NOTICE:
${receipt.scientificNotice}
====================================
AERIS — Urban Air Quality Companion
    `.trim();

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-3xl border border-slate-300/80 bg-white/90 p-6 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
      {/* Receipt Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Receipt className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Decision Receipt
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                #{receipt.receiptId}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {receipt.locationName} • {new Date(receipt.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {receipt.dataSource}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToCloud}
            disabled={isSaving}
            aria-label="Save decision receipt to cloud"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
              savedSuccess
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {savedSuccess ? (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">Saved to Cloud</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
                <span>{isSaving ? "Saving..." : "Save to Cloud"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy decision receipt text to clipboard"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparative Side-by-Side Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Baseline Choice */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Baseline Choice
            </span>
            {baseline.isHypotheticalSimulated ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Simulated
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                Forecasted
              </span>
            )}
          </div>

          <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            {baseline.label}
          </h3>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {baseline.description}
          </p>

          {baseline.forecastedPm25 !== null && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {baseline.forecastedPm25} µg/m³
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {baseline.forecastedAqiCategory}
              </span>
            </div>
          )}

          <ul className="mt-3 space-y-1 border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-600 dark:border-slate-700/60 dark:text-slate-400">
            {baseline.contextNotes.map((note, idx) => (
              <li key={`base-note-${idx}`} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Alternative Choice */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-900/60 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-cyan-300">
              Evaluated Alternative
            </span>
            {alternative.isHypotheticalSimulated ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Simulated
              </span>
            ) : (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-semibold text-teal-800 dark:bg-cyan-950 dark:text-cyan-300">
                Forecasted
              </span>
            )}
          </div>

          <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            {alternative.label}
          </h3>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {alternative.description}
          </p>

          {alternative.forecastedPm25 !== null && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-teal-900 dark:text-cyan-200">
                {alternative.forecastedPm25} µg/m³
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {alternative.forecastedAqiCategory}
              </span>
            </div>
          )}

          <ul className="mt-3 space-y-1 border-t border-teal-200/60 pt-2.5 text-[11px] text-slate-600 dark:border-teal-900/60 dark:text-slate-400">
            {alternative.contextNotes.map((note, idx) => (
              <li key={`alt-note-${idx}`} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-500 dark:bg-cyan-400" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Delta Callout */}
      <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-4 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-cyan-950 dark:text-cyan-300">
            <ArrowRight className="h-3 w-3" />
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            Environmental Delta Analysis:
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {delta.summaryText}
        </p>
      </div>

      {/* Rule Application, Trade-Offs & Assumptions */}
      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-5 text-xs md:grid-cols-2 dark:border-slate-800">
        <div>
          <span className="block font-bold text-slate-900 dark:text-slate-100">
            Deterministic Decision Rule:
          </span>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {receipt.ruleTitle} ({receipt.applicableRuleId})
          </p>

          <span className="mt-3 block font-bold text-slate-900 dark:text-slate-100">
            Operational Trade-Offs:
          </span>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {receipt.tradeOffs}
          </p>
        </div>

        <div>
          <span className="block font-bold text-slate-900 dark:text-slate-100">
            Explicit Scenario Assumptions:
          </span>
          <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-400">
            {receipt.assumptions.map((assump, idx) => (
              <li key={`assump-${idx}`} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-cyan-400" />
                <span>{assump}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scientific Notice Footer */}
      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <div>
          <strong className="text-slate-700 dark:text-slate-300">Scientific Integrity Disclosure: </strong>
          {receipt.scientificNotice}
        </div>
      </div>

      {/* Cloud Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={user}
          onAuthSuccess={() => {
            handleSaveToCloud();
          }}
        />
      )}
    </div>
  );
}
