/**
 * AERIS Gemini Intelligence — Server-Side GenAI Client Singleton
 *
 * CRITICAL SECURITY & KEY SAFEKEEPING:
 * 1. process.env.GEMINI_API_KEY is accessed EXCLUSIVELY on the server.
 * 2. It is NEVER exposed to the browser or prefixed with NEXT_PUBLIC_.
 * 3. Never print or log the key in test reports, logs, or exceptions.
 * 4. If the key is missing or blank, returns null to trigger deterministic fallbacks.
 */

import { GoogleGenAI } from "@google/genai";

let genAiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  if (!genAiInstance) {
    genAiInstance = new GoogleGenAI({ apiKey: apiKey.trim() });
  }

  return genAiInstance;
}

/**
 * Resets the client instance (useful for test environments).
 */
export function resetGeminiClient(): void {
  genAiInstance = null;
}
