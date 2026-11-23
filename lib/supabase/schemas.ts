import { z } from "zod";

/**
 * Zod validation schema for persisting saved plans to PostgreSQL.
 */
export const SavePlanPayloadSchema = z.object({
  title: z.string().min(1).max(120),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  locationName: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  primaryPollutant: z.string().min(1).max(50),
  estimatedCpcbAqi: z.number().int().min(0).max(1000),
  cpcbCategory: z.string().min(1).max(50),
  actionsCount: z.number().int().min(0),
  planPayload: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().default(1),
});

export type SavePlanPayload = z.infer<typeof SavePlanPayloadSchema>;

/**
 * Zod validation schema for persisting decision receipts.
 */
export const SaveDecisionReceiptSchema = z.object({
  receiptId: z.string().min(1).max(100),
  scenarioId: z.string().min(1).max(100),
  scenarioLabel: z.string().min(1).max(200),
  timingSlot: z.string().min(1).max(100),
  actionType: z.string().min(1).max(100),
  cpcbAqiBand: z.string().min(1).max(50),
  hourlyPm25Estimate: z.number().min(0),
  mitigationSteps: z.array(z.string()).default([]),
});

export type SaveDecisionReceiptPayload = z.infer<typeof SaveDecisionReceiptSchema>;

/**
 * Zod validation schema for recording scenario simulation history.
 */
export const SaveScenarioHistorySchema = z.object({
  scenarioType: z.string().min(1).max(100),
  locationName: z.string().min(1).max(200),
  baselinePm25: z.number().min(0),
  optimalPm25: z.number().min(0),
  exposureReductionPct: z.number().min(0).max(100),
  receiptPayload: z.record(z.string(), z.unknown()),
});

export type SaveScenarioHistoryPayload = z.infer<typeof SaveScenarioHistorySchema>;
