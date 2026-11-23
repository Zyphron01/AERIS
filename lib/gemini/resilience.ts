/**
 * AERIS Gemini Intelligence — Cumulative Deadline & Bounded Resilience
 *
 * CRITICAL COST & RESILIENCE RULE:
 * 1. A single total request deadline budget covers the ENTIRE operation including all retries.
 * 2. Retries can NEVER multiply an 8-second deadline into an unexpectedly long request.
 * 3. Never retry client validation errors, authentication failures, or non-retryable 4xx errors.
 */

import { GEMINI_CONFIG } from "./types";

export class NonRetryableError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "NonRetryableError";
  }
}

export class CumulativeDeadlineExceededError extends Error {
  constructor(message = "Total cumulative request deadline exceeded.") {
    super(message);
    this.name = "CumulativeDeadlineExceededError";
  }
}

interface ResilienceOptions {
  totalDeadlineMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

/**
 * Determines whether an error is transient and eligible for retry.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof NonRetryableError) {
    return false;
  }

  if (error instanceof CumulativeDeadlineExceededError) {
    return false;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Non-retryable keywords
    if (
      msg.includes("invalid argument") ||
      msg.includes("bad request") ||
      msg.includes("api_key") ||
      msg.includes("unauthenticated") ||
      msg.includes("permission denied") ||
      msg.includes("validation")
    ) {
      return false;
    }

    // Retryable keywords: rate limit (429), service unavailable (503), network resets
    if (
      msg.includes("resource_exhausted") ||
      msg.includes("429") ||
      msg.includes("unavailable") ||
      msg.includes("503") ||
      msg.includes("econnreset") ||
      msg.includes("fetch failed")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Executes an asynchronous operation bounded by a strict CUMULATIVE deadline.
 * All retries deduct from the same remaining time budget.
 */
export async function executeWithTotalDeadline<T>(
  task: (signal: AbortSignal, attemptNumber: number) => Promise<T>,
  options: ResilienceOptions = {}
): Promise<T> {
  const totalDeadlineMs = options.totalDeadlineMs ?? GEMINI_CONFIG.TOTAL_DEADLINE_MS;
  const maxRetries = options.maxRetries ?? GEMINI_CONFIG.MAX_RETRIES;
  const initialBackoffMs = options.initialBackoffMs ?? GEMINI_CONFIG.INITIAL_BACKOFF_MS;

  const deadlineTimestamp = Date.now() + totalDeadlineMs;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const remainingBudgetMs = deadlineTimestamp - Date.now();

    // If total deadline has expired, abort immediately without retrying
    if (remainingBudgetMs <= 50) {
      throw new CumulativeDeadlineExceededError(
        `Cumulative request deadline (${totalDeadlineMs}ms) exhausted after ${attempt - 1} retries.`
      );
    }

    // Per-attempt controller bounded by the REMAINING cumulative time
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort(new CumulativeDeadlineExceededError("Cumulative deadline timed out."));
    }, remainingBudgetMs);

    try {
      const result = await task(abortController.signal, attempt);
      clearTimeout(timeoutId);
      return result;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err;

      // Check if we can retry
      const canRetry = attempt <= maxRetries && isTransientError(err);
      if (!canRetry) {
        throw err;
      }

      // Exponential backoff with jitter
      const backoffDelay = initialBackoffMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      const budgetAfterBackoff = deadlineTimestamp - Date.now() - backoffDelay;

      if (budgetAfterBackoff <= 100) {
        // Insufficient budget remaining for a retry attempt
        throw new CumulativeDeadlineExceededError(
          `Insufficient cumulative budget remaining for retry attempt ${attempt + 1}.`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}
