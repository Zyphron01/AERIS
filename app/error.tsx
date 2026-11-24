"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({
  error,
  reset,
}: ErrorBoundaryProps): React.JSX.Element {
  useEffect(() => {
    // Redacted error logging preserving user privacy
    if (process.env.NODE_ENV !== "production") {
      console.error("Client error caught by AERIS error boundary:", error.message);
    }
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
        Something unexpected occurred
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        AERIS encountered a temporary client-side error. Your local household profile and saved receipts remain intact.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs font-mono text-slate-400 dark:text-slate-500">
          Diagnostic Reference: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Try again</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Return home</span>
        </Link>
      </div>
    </div>
  );
}
