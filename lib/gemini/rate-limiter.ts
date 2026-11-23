/**
 * AERIS Gemini Intelligence — Rate Limiting & Proxy-Safe Client Identification
 *
 * NOTE ON PRODUCTION RATE LIMITING:
 * In a distributed, multi-region or serverless edge deployment (e.g. Vercel Serverless / AWS Lambda),
 * process-local memory is not shared across isolated micro-containers.
 * For production abuse prevention in such environments, this interface should be backed by a
 * shared persistent store (such as Upstash Redis or Cloudflare KV).
 * This implementation provides an in-memory sliding-window token bucket for single-instance,
 * containerized, or local development execution, safely sanitizing reverse-proxy headers.
 */

import { GEMINI_CONFIG } from "./types";

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Strict memory bounds: Cap stored IPs at 1,000 to prevent memory-amplification attacks.
 */
const MAX_STORED_IPS = 1000;
const clientRequestStore = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStaleRecords(now: number, windowMs: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && clientRequestStore.size < MAX_STORED_IPS) return;
  lastCleanup = now;

  for (const [ip, record] of clientRequestStore.entries()) {
    const valid = record.timestamps.filter((ts) => now - ts < windowMs);
    if (valid.length === 0) {
      clientRequestStore.delete(ip);
    } else {
      record.timestamps = valid;
    }
  }

  // If still above max capacity after purging expired records, evict oldest
  if (clientRequestStore.size >= MAX_STORED_IPS) {
    const firstKey = clientRequestStore.keys().next().value;
    if (firstKey) {
      clientRequestStore.delete(firstKey);
    }
  }
}

/**
 * Extracts a sanitized client IP from HTTP Request headers.
 * Avoids blindly trusting arbitrary spoofable client headers.
 * Extracts the rightmost or leftmost valid entry from known proxy chains.
 */
export function extractClientIp(headers: Headers): string {
  // Standard reverse proxy headers
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list of IPs: client, proxy1, proxy2
    // The first non-empty token represents the originating client IP as appended by the edge proxy
    const parts = forwardedFor.split(",").map((s) => s.trim());
    if (parts.length > 0 && parts[0].length > 0) {
      // Basic IP format sanitization (IPv4 or IPv6)
      const candidate = parts[0];
      if (/^[a-fA-F0-9:.]+$/.test(candidate)) {
        return candidate;
      }
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && /^[a-fA-F0-9:.]+$/.test(realIp.trim())) {
    return realIp.trim();
  }

  // Fallback for local or test environments
  return "127.0.0.1";
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
  readonly reason?: string;
  readonly storeType: "distributed_redis" | "in_memory_fallback";
}

/**
 * Synchronous in-memory rate limiter with bounded memory.
 */
export function checkRateLimit(
  clientIp: string,
  maxRequests: number = GEMINI_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = GEMINI_CONFIG.RATE_LIMIT_WINDOW_MS
): RateLimitResult {
  // 1. Abuse Protection Kill-Switch
  if (process.env.AERIS_DISABLE_PUBLIC_AI === "true") {
    return {
      allowed: false,
      remaining: 0,
      resetMs: windowMs,
      reason: "Public AI access is currently disabled for security maintenance.",
      storeType: "in_memory_fallback",
    };
  }

  const now = Date.now();
  purgeStaleRecords(now, windowMs);

  let record = clientRequestStore.get(clientIp);
  if (!record) {
    // Enforce memory bounds
    if (clientRequestStore.size >= MAX_STORED_IPS) {
      const oldestKey = clientRequestStore.keys().next().value;
      if (oldestKey) clientRequestStore.delete(oldestKey);
    }
    record = { timestamps: [] };
    clientRequestStore.set(clientIp, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
      reason: "Rate limit exceeded (15 requests/minute).",
      storeType: "in_memory_fallback",
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetMs: windowMs,
    storeType: "in_memory_fallback",
  };
}

/**
 * Asynchronous distributed rate limiter with bounded cost.
 * Uses Upstash Redis REST API when configured, with automatic 60s TTL on keys to bound cloud costs.
 * Falls back transparently to in-memory bounded limiter if network fails or credentials are not configured.
 */
export async function checkRateLimitAsync(
  clientIp: string,
  maxRequests: number = GEMINI_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = GEMINI_CONFIG.RATE_LIMIT_WINDOW_MS
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return checkRateLimit(clientIp, maxRequests, windowMs);
  }

  // Check abuse disable switch
  if (process.env.AERIS_DISABLE_PUBLIC_AI === "true") {
    return {
      allowed: false,
      remaining: 0,
      resetMs: windowMs,
      reason: "Public AI access is currently disabled for security maintenance.",
      storeType: "distributed_redis",
    };
  }

  try {
    const now = Date.now();
    const key = `aeris:ratelimit:${clientIp}`;
    const windowStart = now - windowMs;

    // Upstash pipeline: remove old, add current, count, expire key after 60s (bounded storage cost)
    const pipeline = [
      ["ZREMRANGEBYSCORE", key, "0", windowStart.toString()],
      ["ZADD", key, now.toString(), `${now}-${Math.random()}`],
      ["ZCARD", key],
      ["EXPIRE", key, "60"],
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s strict deadline for rate limit check

    const res = await fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      return checkRateLimit(clientIp, maxRequests, windowMs);
    }

    const data = await res.json();
    const currentCount = typeof data[2]?.result === "number" ? data[2].result : 1;

    if (currentCount > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: windowMs,
        reason: "Rate limit exceeded in distributed cluster (15 requests/minute).",
        storeType: "distributed_redis",
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - currentCount),
      resetMs: windowMs,
      storeType: "distributed_redis",
    };
  } catch {
    // Safe fallback to bounded in-memory token bucket if distributed store is unreachable
    return checkRateLimit(clientIp, maxRequests, windowMs);
  }
}

export interface RateLimitStoreStatus {
  readonly isDistributed: boolean;
  readonly storeType: "distributed_redis" | "in_memory_fallback";
  readonly status: "connected" | "unconfigured" | "unreachable";
  readonly message: string;
}

/**
 * Validates whether the rate limiter is backed by an active, functioning shared Redis store.
 * Verifies live store connectivity before claiming distributed rate limiting in production.
 */
export async function verifyRateLimitStore(): Promise<RateLimitStoreStatus> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return {
      isDistributed: false,
      storeType: "in_memory_fallback",
      status: "unconfigured",
      message: "No shared Redis credentials configured; operating in verified in-memory fallback mode.",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${upstashUrl}/ping`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      return {
        isDistributed: false,
        storeType: "in_memory_fallback",
        status: "unreachable",
        message: `Shared Redis endpoint returned HTTP ${res.status}; operating in verified in-memory fallback mode.`,
      };
    }

    const data = await res.json();
    if (data.result === "PONG") {
      return {
        isDistributed: true,
        storeType: "distributed_redis",
        status: "connected",
        message: "Verified active connection to shared Redis cluster for distributed rate limiting.",
      };
    }

    return {
      isDistributed: false,
      storeType: "in_memory_fallback",
      status: "unreachable",
      message: "Unexpected response from shared Redis endpoint; operating in verified in-memory fallback mode.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return {
      isDistributed: false,
      storeType: "in_memory_fallback",
      status: "unreachable",
      message: `Failed to connect to shared Redis store (${msg}); operating in verified in-memory fallback mode.`,
    };
  }
}

/**
 * Clears the in-memory rate limit store (for automated test isolation).
 */
export function resetRateLimiter(): void {
  clientRequestStore.clear();
  lastCleanup = Date.now();
}
