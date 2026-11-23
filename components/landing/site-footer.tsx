import React from "react";
import Link from "next/link";

export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="relative z-10 border-t border-slate-200 bg-white px-6 py-12 text-sm text-slate-500 transition-colors duration-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 md:px-12 lg:px-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">AERIS</span>
          <span className="mx-2">•</span>
          <span>Your Personal Air Quality Decision Companion</span>
        </div>
        <div className="flex gap-6 text-xs">
          <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-100">
            Live Monitor
          </Link>
          <Link href="/daily-plan" className="hover:text-slate-900 dark:hover:text-slate-100">
            AI Recommendations
          </Link>
          <Link href="/indoor-air" className="hover:text-slate-900 dark:hover:text-slate-100">
            Indoor Coach
          </Link>
          <Link href="/scenarios" className="hover:text-slate-900 dark:hover:text-slate-100">
            What-If Simulator
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-7xl text-center text-xs text-slate-400 dark:text-slate-500 sm:text-left">
        Disclaimer: AERIS provides environmental decision guidance based on available modeled atmospheric data.
        It does not provide medical diagnoses or replace official regulatory station notices.
      </div>
    </footer>
  );
}
