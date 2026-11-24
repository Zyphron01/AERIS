"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { NormalizedTelemetry } from "./types";

export interface UseTelemetryResult {
  readonly telemetry: NormalizedTelemetry | null;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

async function fetchTelemetryPayload(
  locationId: string,
  signal: AbortSignal
): Promise<NormalizedTelemetry> {
  const res = await fetch(
    `/api/telemetry?locationId=${encodeURIComponent(locationId)}`,
    { signal }
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const msg =
      errorJson && typeof errorJson.error === "string"
        ? errorJson.error
        : `HTTP ${res.status}: Failed to retrieve telemetry`;
    throw new Error(msg);
  }

  return (await res.json()) as NormalizedTelemetry;
}

/**
 * Shared client hook for fetching normalized location telemetry.
 * Enforces AbortController cancellation, sequence-based stale-response protection,
 * and ensures old-city telemetry is never exposed while a new city request is pending.
 */
export function useTelemetry(locationId: string): UseTelemetryResult {
  const [telemetry, setTelemetry] = useState<NormalizedTelemetry | null>(null);
  const [resolvedLocationId, setResolvedLocationId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestSeqRef = useRef<number>(0);
  const activeControllerRef = useRef<AbortController | null>(null);
  const currentLocationRef = useRef<string>(locationId);

  useEffect(() => {
    currentLocationRef.current = locationId;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const seq = ++requestSeqRef.current;

    let active = true;

    async function runInitial() {
      try {
        const data = await fetchTelemetryPayload(locationId, controller.signal);
        if (!active || controller.signal.aborted || seq !== requestSeqRef.current) {
          return;
        }
        setTelemetry(data);
        setError(null);
        setResolvedLocationId(locationId);
        setIsRefreshing(false);
      } catch (err: unknown) {
        if (!active || isAbortError(err) || controller.signal.aborted || seq !== requestSeqRef.current) {
          return;
        }
        const msg =
          err instanceof Error ? err.message : "Failed to load live air quality telemetry";
        setTelemetry(null);
        setError(msg);
        setResolvedLocationId(locationId);
        setIsRefreshing(false);
      }
    }

    void runInitial();

    return () => {
      active = false;
      controller.abort();
    };
  }, [locationId]);

  const refetch = useCallback(async () => {
    const targetLocationId = currentLocationRef.current;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const seq = ++requestSeqRef.current;

    const hasExistingForLocation =
      resolvedLocationId === targetLocationId && telemetry !== null;
    if (hasExistingForLocation) {
      setIsRefreshing(true);
    } else {
      setResolvedLocationId(null);
    }
    setError(null);

    try {
      const data = await fetchTelemetryPayload(targetLocationId, controller.signal);
      if (controller.signal.aborted || seq !== requestSeqRef.current) {
        return;
      }
      setTelemetry(data);
      setError(null);
      setResolvedLocationId(targetLocationId);
      setIsRefreshing(false);
    } catch (err: unknown) {
      if (isAbortError(err) || controller.signal.aborted || seq !== requestSeqRef.current) {
        return;
      }
      const msg =
        err instanceof Error ? err.message : "Failed to load live air quality telemetry";
      setError(msg);
      setResolvedLocationId(targetLocationId);
      setIsRefreshing(false);
    }
  }, [resolvedLocationId, telemetry]);

  const isPendingLocationChange = resolvedLocationId !== locationId;

  return {
    telemetry: isPendingLocationChange ? null : telemetry,
    isLoading: isPendingLocationChange,
    isRefreshing: isPendingLocationChange ? false : isRefreshing,
    error: isPendingLocationChange ? null : error,
    refetch,
  };
}
