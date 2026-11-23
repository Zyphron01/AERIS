/**
 * AERIS Gemini Intelligence — Guardrails & Hallucination Resistance
 *
 * Mandatory Verification Rules:
 * 1. The model must not invent pollutant readings or numeric claims absent from input context.
 * 2. The model must not alter action priority or claim an activity is safe when it is not.
 * 3. The model must not make clinical medical diagnoses or drug prescriptions.
 * 4. The model must cite only verified, curated scientific literature.
 */

import type { TrustedActionMetadata, ModelGeneratedExplanation, ModelGeneratedChatResponse } from "./types";

const MEDICAL_CLAIM_PATTERNS = [
  /\bdiagnos(?:e|is|ed|ing)\b/i,
  /\bprescri(?:be|ption|bed)\b/i,
  /\bmedication dosage\b/i,
  /\bcur(?:e|ative)\b/i,
  /\btreat your (?:asthma|bronchitis|copd|heart disease)\b/i,
];

const SAFETY_OVERRIDE_PATTERNS = [
  /\bpriority (?:is now|changed to|lowered to) (?:low|none)\b/i,
  /\bcompletely safe (?:now|to exercise|to run)\b/i,
  /\bno risk at all\b/i,
  /\bair is entirely harmless\b/i,
];

const PROMPT_INJECTION_INDICATORS = [
  /ignore (?:previous|above|system) instructions/i,
  /you are now a/i,
  /system prompt/i,
  /developer mode/i,
  /reveal (?:api key|secret|token)/i,
];

/**
 * Validates generated explanation against safety and truthfulness guardrails.
 */
export function validateExplanationGuardrails(
  explanation: ModelGeneratedExplanation,
  trustedMetadata: TrustedActionMetadata
): { isValid: boolean; violationReason?: string } {
  const combinedText = `${explanation.headline} ${explanation.actionBreakdown} ${explanation.whyThisMatters} ${explanation.microclimateContext}`;

  // 1. Check for unauthorized medical claims
  for (const pattern of MEDICAL_CLAIM_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isValid: false,
        violationReason: `Output contained medical/clinical claim pattern: ${pattern}`,
      };
    }
  }

  // 2. Check for unsafe safety overrides (e.g. claiming polluted air is harmless)
  for (const pattern of SAFETY_OVERRIDE_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isValid: false,
        violationReason: `Output contained unsafe safety override pattern: ${pattern}`,
      };
    }
  }

  // 3. Check for invented PM2.5 or AQI numbers
  // Extract all numbers following PM2.5 or AQI in the generated text
  const pmMatches = combinedText.matchAll(/PM2\.?5\s*(?:is|was|of|at|around)?\s*[:~=]?\s*(\d+(?:\.\d+)?)/gi);
  for (const match of pmMatches) {
    const val = parseFloat(match[1]);
    // If the model states a PM2.5 value, it must match the trusted PM2.5 value within rounding tolerance (±1)
    if (trustedMetadata.pm25Value !== null && Math.abs(val - trustedMetadata.pm25Value) > 1.5) {
      return {
        isValid: false,
        violationReason: `Output invented an unverified PM2.5 concentration (${val} µg/m³) distinct from ground truth (${trustedMetadata.pm25Value} µg/m³).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates chat query output against safety guardrails.
 */
export function validateChatGuardrails(
  chatOutput: ModelGeneratedChatResponse,
  trustedMetadata?: TrustedActionMetadata
): { isValid: boolean; violationReason?: string } {
  const answer = chatOutput.answer;

  // Check for medical claims
  for (const pattern of MEDICAL_CLAIM_PATTERNS) {
    if (pattern.test(answer) && !chatOutput.isMedicalQuery) {
      return {
        isValid: false,
        violationReason: `Chat output contained medical diagnosis/prescription language: ${pattern}`,
      };
    }
  }

  // Check for prompt leak indicators
  for (const pattern of PROMPT_INJECTION_INDICATORS) {
    if (pattern.test(answer)) {
      return {
        isValid: false,
        violationReason: `Chat output reflected internal system prompt or injection probe.`,
      };
    }
  }

  // Check for hallucinated pollutant numbers if trusted metadata is supplied
  if (trustedMetadata?.pm25Value !== null && trustedMetadata?.pm25Value !== undefined) {
    const pmMatches = answer.matchAll(/PM2\.?5\s*(?:is|was|of|at|around)?\s*[:~=]?\s*(\d+(?:\.\d+)?)/gi);
    for (const match of pmMatches) {
      const val = parseFloat(match[1]);
      if (Math.abs(val - trustedMetadata.pm25Value) > 1.5) {
        return {
          isValid: false,
          violationReason: `Chat answer invented an unverified PM2.5 concentration (${val} µg/m³) distinct from ground truth (${trustedMetadata.pm25Value} µg/m³).`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Sanitizes user prompt by stripping known prompt injection patterns
 * and enforcing maximum input size.
 */
export function sanitizeUserPrompt(prompt: string): string {
  let sanitized = prompt;
  for (const pattern of PROMPT_INJECTION_INDICATORS) {
    sanitized = sanitized.replace(pattern, "[filtered instruction]");
  }
  if (sanitized.length > 500) {
    sanitized = sanitized.slice(0, 500);
  }
  return sanitized;
}
