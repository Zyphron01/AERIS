/**
 * AERIS Gemini Intelligence — TypeScript Domain Contracts
 * Strict types for server-side verification, rate limiting, and structured explanations.
 */

import type {
  HouseholdProfile,
  RecommendationPriority,
  RecommendationCategory,
} from "@/lib/decision-engine/types";

export type AssistantLanguage = "en" | "hi";

export interface ExplanationRequest {
  readonly actionId: string;
  readonly locationId: string;
  readonly profile: HouseholdProfile;
  readonly language?: AssistantLanguage;
}

export interface ChatRequest {
  readonly message: string;
  readonly locationId: string;
  readonly profile: HouseholdProfile;
  readonly actionId?: string;
  readonly language?: AssistantLanguage;
}

/**
 * Immutable trusted facts bound exclusively by the server.
 * The AI is NEVER allowed to generate, alter, or override these values.
 */
export interface TrustedActionMetadata {
  readonly actionId: string;
  readonly category: RecommendationCategory;
  readonly priority: RecommendationPriority;
  readonly applicableRuleId: string;
  readonly evidenceReferences: readonly string[];
  readonly sourceValidityTimestamp: string;
  readonly cpcbAqiValue: number | null;
  readonly cpcbAqiCategory: string;
  readonly pm25Value: number | null;
  readonly isModelEstimate: boolean;
}

/**
 * AI-generated narrative explanation strictly validated against hallucinations.
 */
export interface ModelGeneratedExplanation {
  readonly headline: string;
  readonly actionBreakdown: string;
  readonly whyThisMatters: string;
  readonly microclimateContext: string;
}

export interface ExplanationResponse {
  readonly status: "success" | "fallback";
  readonly attributionLabel: "AI-generated explanation" | "Deterministic evidence-based explanation";
  readonly language: AssistantLanguage;
  readonly generatedAt: string;
  readonly explanation: ModelGeneratedExplanation;
  readonly trustedMetadata: TrustedActionMetadata;
  readonly disclaimer: string;
}

export interface ModelGeneratedChatResponse {
  readonly answer: string;
  readonly contextCitation: string;
  readonly confidenceNotice: string;
  readonly isMedicalQuery: boolean;
}

export interface ChatResponse {
  readonly status: "success" | "fallback";
  readonly attributionLabel: "AI-generated response" | "Deterministic advisory response";
  readonly language: AssistantLanguage;
  readonly response: ModelGeneratedChatResponse;
  readonly trustedMetadata?: TrustedActionMetadata;
  readonly disclaimer: string;
}

/** Service resilience limits */
export const GEMINI_CONFIG = {
  MODEL_NAME: "gemini-2.5-flash",
  TOTAL_DEADLINE_MS: 8000,
  MAX_RETRIES: 2,
  INITIAL_BACKOFF_MS: 500,
  MAX_INPUT_CHARS: 500,
  MAX_OUTPUT_TOKENS: 500,
  RATE_LIMIT_MAX_REQUESTS: 15,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
} as const;
