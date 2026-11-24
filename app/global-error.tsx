"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans">
        <h1 className="text-2xl font-bold">A critical error occurred</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          AERIS root layout encountered a critical error.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
        >
          Reload application
        </button>
      </body>
    </html>
  );
}
