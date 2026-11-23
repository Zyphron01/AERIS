import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

interface RoutePlaceholderProps {
  readonly routeTitle: string;
  readonly routeDescription: string;
  readonly milestoneBadge?: string;
}

export function RoutePlaceholder({
  routeTitle,
  routeDescription,
  milestoneBadge = "Active Architecture Module",
}: RoutePlaceholderProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <span className="font-semibold text-slate-900 dark:text-slate-100">AERIS</span>
          </div>

          <nav className="flex items-center gap-5 text-xs">
            <Link href="/dashboard" className="hover:text-teal-600 dark:hover:text-cyan-400">
              Live Monitor
            </Link>
            <Link href="/daily-plan" className="hover:text-teal-600 dark:hover:text-cyan-400">
              Daily Plan
            </Link>
            <Link href="/indoor-air" className="hover:text-teal-600 dark:hover:text-cyan-400">
              Indoor Air
            </Link>
            <Link href="/scenarios" className="hover:text-teal-600 dark:hover:text-cyan-400">
              Scenarios
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-700 dark:text-cyan-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{milestoneBadge}</span>
        </div>

        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {routeTitle}
        </h1>

        <p className="mb-8 text-base text-slate-600 dark:text-slate-400">
          {routeDescription}
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            Design & Architecture Notice
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Per AERIS Engineering Rule 10, simulated air-quality data is strictly prohibited.
            In this foundational milestone, live telemetry connections, Gemini reasoning pipelines,
            and Supabase persistence remain unmounted to prevent mock data misrepresentation.
          </p>
        </div>
      </main>
    </div>
  );
}
