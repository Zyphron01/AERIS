"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { RecommendationAction, HouseholdProfile } from "@/lib/decision-engine/types";
import type { ExplanationResponse, ChatResponse, AssistantLanguage } from "@/lib/gemini/types";
import {
  Sparkles,
  X,
  Languages,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Send,
  Cpu,
} from "lucide-react";

interface AiExplanationDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly action?: RecommendationAction | null;
  readonly profile: HouseholdProfile;
  readonly locationId: string;
}

export function AiExplanationDrawer({
  isOpen,
  onClose,
  action,
  profile,
  locationId,
}: AiExplanationDrawerProps): React.JSX.Element | null {
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const [explanationData, setExplanationData] = useState<ExplanationResponse | null>(null);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeAbortRef = useRef<AbortController | null>(null);
  const explainSeqRef = useRef<number>(0);

  // Keyboard accessibility: Escape closes drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap / auto-focus on open
  useEffect(() => {
    if (isOpen) {
      drawerRef.current?.focus();
    }
  }, [isOpen]);

  // Unified explanation fetcher with AbortController & sequence protection
  const performExplanationFetch = useCallback(
    async (
      targetAction: RecommendationAction,
      signal: AbortSignal,
      seq: number
    ) => {
      try {
        const res = await fetch("/api/assistant/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            actionId: targetAction.id,
            locationId,
            profile,
            language,
          }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.error || `HTTP ${res.status}: Failed to generate explanation.`);
        }

        const data: ExplanationResponse = await res.json();
        if (signal.aborted || seq !== explainSeqRef.current) {
          return;
        }

        setExplanationData(data);
        setError(null);
        setIsLoading(false);
      } catch (err: unknown) {
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          signal.aborted ||
          seq !== explainSeqRef.current
        ) {
          return;
        }

        const msg = err instanceof Error ? err.message : "Error connecting to explanation service.";
        setError(msg);
        setIsLoading(false);
      }
    },
    [locationId, profile, language]
  );

  const loadExplanation = useCallback(async () => {
    if (!action) return;

    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    const seq = ++explainSeqRef.current;

    setIsLoading(true);
    setError(null);
    setChatResponse(null);

    await performExplanationFetch(action, controller.signal, seq);
  }, [action, performExplanationFetch]);

  useEffect(() => {
    if (!isOpen || !action) {
      activeAbortRef.current?.abort();
      return;
    }

    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    const seq = ++explainSeqRef.current;

    void performExplanationFetch(action, controller.signal, seq);

    return () => {
      controller.abort();
    };
  }, [isOpen, action, performExplanationFetch]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          locationId,
          profile,
          actionId: action?.id,
          language,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${res.status}: Assistant query failed.`);
      }

      const data: ChatResponse = await res.json();
      setChatResponse(data);
      setChatInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending question.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200/90 bg-white shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs dark:bg-cyan-500 dark:text-slate-950">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 id="ai-drawer-title" className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                AERIS Air Intelligence
              </h2>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Contextual environmental explanation
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage((prev) => (prev === "en" ? "hi" : "en"))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
              aria-label={language === "en" ? "Switch to Hindi language" : "Switch to English language"}
            >
              <Languages className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
              <span>{language === "en" ? "हिंदी" : "English"}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close assistant drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Loading Skeleton */}
          {isLoading && !explanationData && (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-3/4 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div>
                  <div className="font-semibold">Unable to generate AI explanation</div>
                  <div className="mt-1 leading-relaxed">{error}</div>
                  <button
                    type="button"
                    onClick={() => loadExplanation()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white shadow-xs hover:bg-rose-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Data Card */}
          {explanationData && (
            <div className="space-y-5">
              {/* Attribution Banner */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
                  <span className="font-semibold">{explanationData.attributionLabel}</span>
                </div>
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] shadow-xs dark:bg-slate-900">
                  {explanationData.trustedMetadata.applicableRuleId}
                </span>
              </div>

              {/* AI Narrative Breakdown */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {explanationData.explanation.headline}
                </h3>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800/80 dark:bg-slate-800/60 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {language === "hi" ? "कार्रवाई का विवरण (Action Steps):" : "Recommended Steps:"}
                  </div>
                  {explanationData.explanation.actionBreakdown}
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800/80 dark:bg-slate-800/60 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {language === "hi" ? "वैज्ञानिक महत्व (Scientific Rationale):" : "Why This Matters:"}
                  </div>
                  {explanationData.explanation.whyThisMatters}
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800/80 dark:bg-slate-800/60 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {language === "hi" ? "वायुमंडलीय संदर्भ (Atmospheric Context):" : "Environmental Context:"}
                  </div>
                  {explanationData.explanation.microclimateContext}
                </div>
              </div>

              {/* Deterministic Evidence & Citations (Separate from AI text) */}
              <div className="rounded-2xl border border-teal-200/80 bg-teal-50/60 p-4 text-xs dark:border-teal-900/60 dark:bg-teal-950/30">
                <div className="flex items-center gap-1.5 font-semibold text-teal-950 dark:text-cyan-200">
                  <BookOpen className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
                  <span>Authoritative Scientific Citations:</span>
                </div>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {explanationData.trustedMetadata.evidenceReferences.map((ref, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-bold text-teal-700 dark:text-cyan-400">•</span>
                      <span>{ref}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-teal-200/50 pt-2 text-[10px] text-slate-500 dark:border-teal-900/40 dark:text-slate-400">
                  {explanationData.disclaimer}
                </div>
              </div>
            </div>
          )}

          {/* Chat Response Display */}
          {chatResponse && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs dark:border-teal-800 dark:bg-teal-950/40">
              <div className="flex items-center justify-between text-[11px] font-semibold text-teal-900 dark:text-cyan-200">
                <span>{chatResponse.attributionLabel}</span>
                {chatResponse.response.isMedicalQuery && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Non-Clinical Notice
                  </span>
                )}
              </div>
              <div className="mt-2 leading-relaxed text-slate-800 dark:text-slate-200">
                {chatResponse.response.answer}
              </div>
              <div className="mt-2.5 border-t border-teal-200/60 pt-2 text-[11px] text-slate-500 dark:border-teal-800/60 dark:text-slate-400">
                <strong>Citation:</strong> {chatResponse.response.contextCitation}
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Section */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <form onSubmit={handleSendChat} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                language === "hi"
                  ? "इस सिफारिश के बारे में प्रश्न पूछें..."
                  : "Ask a question about this recommendation..."
              }
              maxLength={500}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isLoading || !chatInput.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 p-2 text-white shadow-xs transition hover:bg-teal-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              aria-label="Send question to assistant"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            Answers are strictly non-clinical and grounded in verified CPCB/WHO guidance.
          </div>
        </div>
      </div>
    </div>
  );
}
