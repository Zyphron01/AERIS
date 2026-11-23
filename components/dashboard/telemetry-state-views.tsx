import React from "react";
import { AlertOctagon, RefreshCw, AlertTriangle } from "lucide-react";

interface TelemetryLoadingStateProps {
  readonly message?: string;
}

export function TelemetryLoadingState({
  message = "Acquiring live atmospheric chemical transport telemetry...",
}: TelemetryLoadingStateProps): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-slate-800 dark:text-cyan-400">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
      <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-slate-100">
        Connecting to Open-Meteo Atmospheric Models
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {message}
      </p>

      {/* Loading Skeleton */}
      <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 md:col-span-2" />
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}

interface TelemetryErrorStateProps {
  readonly errorMessage: string;
  readonly errorDetails?: string;
  readonly onRetry: () => void;
}

export function TelemetryErrorState({
  errorMessage,
  errorDetails,
  onRetry,
}: TelemetryErrorStateProps): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-slate-100">
        Environmental Telemetry Service Offline
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {errorMessage}
      </p>
      {errorDetails && (
        <div className="mt-3 max-w-md rounded-xl border border-rose-200 bg-rose-50/50 p-3 font-mono text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          {errorDetails}
        </div>
      )}
      <div className="mt-4 text-xs text-slate-500">
        Per AERIS Permanent Rule 10, simulated readings are never substituted during provider outages.
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Retry Connection</span>
      </button>
    </div>
  );
}

interface StaleDataWarningProps {
  readonly lastUpdated: string;
}

export function StaleDataWarning({ lastUpdated }: StaleDataWarningProps): React.JSX.Element {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <span className="font-semibold">Notice: Telemetry Freshness Window Exceeded.</span>{" "}
        The current readings were captured at {new Date(lastUpdated).toLocaleTimeString()} and may not reflect recent microclimate dispersion changes.
      </div>
    </div>
  );
}
