import React from "react";
import Link from "next/link";
import { Compass, Home, LayoutDashboard } from "lucide-react";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mt-6 text-sm font-semibold tracking-wide uppercase text-teal-600 dark:text-teal-400">
        404 Error
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        The atmospheric route you requested could not be located. Explore live telemetry or generate a personalized daily plan.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          <span>Go to Dashboard</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}
