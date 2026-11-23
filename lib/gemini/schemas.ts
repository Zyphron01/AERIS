/**
 * AERIS Gemini Intelligence — Zod Validation Schemas
 * Runtime input sanitization, minimal context bounds, and structured JSON validation.
 */

import { z } from "zod";
import { HouseholdProfileSchema } from "@/lib/decision-engine/schemas";

export const AssistantLanguageSchema = z.enum(["en", "hi"]).default("en");

export const ExplanationRequestSchema = z.object({
  actionId: z.string().min(1).max(100),
  locationId: z.string().min(1).max(50),
  profile: HouseholdProfileSchema,
  language: AssistantLanguageSchema.optional(),
});

export const ChatRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Question cannot be empty.")
    .max(500, "Question exceeds 500 characters limit.")
    .trim(),
  locationId: z.string().min(1).max(50),
  profile: HouseholdProfileSchema,
  actionId: z.string().max(100).optional(),
  language: AssistantLanguageSchema.optional(),
});

/**
 * Zod schema enforced on Gemini's structured JSON output for action explanations.
 */
export const GeminiExplanationOutputSchema = z.object({
  headline: z.string().min(5).max(150),
  actionBreakdown: z.string().min(10).max(600),
  whyThisMatters: z.string().min(10).max(600),
  microclimateContext: z.string().min(10).max(400),
});

/**
 * Zod schema enforced on Gemini's structured JSON output for chat queries.
 */
export const GeminiChatOutputSchema = z.object({
  answer: z.string().min(10).max(1200),
  contextCitation: z.string().min(5).max(300),
  confidenceNotice: z.string().min(5).max(300),
  isMedicalQuery: z.boolean(),
});
