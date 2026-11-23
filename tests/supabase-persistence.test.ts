import { describe, it, expect, vi } from "vitest";
import {
  SavePlanPayloadSchema,
  SaveDecisionReceiptSchema,
  SaveScenarioHistorySchema,
} from "@/lib/supabase/schemas";
import {
  savePlanToCloud,
  getSavedPlansFromCloud,
  deleteSavedPlanFromCloud,
  saveDecisionReceiptToCloud,
  getSavedDecisionReceiptsFromCloud,
  deleteDecisionReceiptFromCloud,
  recordScenarioHistoryInCloud,
} from "@/lib/supabase/repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// ============================================================================
// 1. Zod Schemas Validation Tests
// ============================================================================
describe("Supabase Persistence Schemas", () => {
  describe("SavePlanPayloadSchema", () => {
    it("accepts a valid plan payload", () => {
      const valid = {
        title: "Daily Plan for New Delhi",
        planDate: "2026-11-22",
        locationName: "New Delhi",
        latitude: 28.6139,
        longitude: 77.209,
        primaryPollutant: "pm2_5",
        estimatedCpcbAqi: 245,
        cpcbCategory: "Poor",
        actionsCount: 3,
        planPayload: { summary: "High particulate pollution today." },
        schemaVersion: 1,
      };

      const result = SavePlanPayloadSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects an invalid date format", () => {
      const invalid = {
        title: "Daily Plan",
        planDate: "22-11-2026", // Not YYYY-MM-DD
        locationName: "New Delhi",
        latitude: 28.6139,
        longitude: 77.209,
        primaryPollutant: "pm2_5",
        estimatedCpcbAqi: 245,
        cpcbCategory: "Poor",
        actionsCount: 1,
        planPayload: {},
      };

      const result = SavePlanPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects out-of-range coordinates", () => {
      const invalid = {
        title: "Plan",
        planDate: "2026-11-22",
        locationName: "Invalid Locus",
        latitude: 95.0, // > 90
        longitude: 200.0, // > 180
        primaryPollutant: "pm2_5",
        estimatedCpcbAqi: 150,
        cpcbCategory: "Moderate",
        actionsCount: 1,
        planPayload: {},
      };

      const result = SavePlanPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects negative AQI or negative action counts", () => {
      const invalid = {
        title: "Plan",
        planDate: "2026-11-22",
        locationName: "Delhi",
        latitude: 28.6,
        longitude: 77.2,
        primaryPollutant: "pm2_5",
        estimatedCpcbAqi: -10, // Invalid negative
        cpcbCategory: "Moderate",
        actionsCount: -1, // Invalid negative
        planPayload: {},
      };

      const result = SavePlanPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("SaveDecisionReceiptSchema", () => {
    it("accepts a valid decision receipt payload", () => {
      const valid = {
        receiptId: "RCP-2026-001",
        scenarioId: "SCN-EX-01",
        scenarioLabel: "Morning Run Postponement",
        timingSlot: "07:00 - 08:00",
        actionType: "outdoor_exercise",
        cpcbAqiBand: "Very Poor",
        hourlyPm25Estimate: 142.5,
        mitigationSteps: ["Shift cardio to 14:00", "Use indoor treadmill"],
      };

      const result = SaveDecisionReceiptSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects negative hourly PM2.5 concentrations", () => {
      const invalid = {
        receiptId: "RCP-2026-002",
        scenarioId: "SCN-EX-01",
        scenarioLabel: "Test",
        timingSlot: "Morning",
        actionType: "exercise",
        cpcbAqiBand: "Good",
        hourlyPm25Estimate: -5.0, // Negative concentration
        mitigationSteps: [],
      };

      const result = SaveDecisionReceiptSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("SaveScenarioHistorySchema", () => {
    it("accepts valid scenario history", () => {
      const valid = {
        scenarioType: "commute_mode",
        locationName: "Bengaluru",
        baselinePm25: 68.0,
        optimalPm25: 22.0,
        exposureReductionPct: 67.6,
        receiptPayload: { receiptId: "RCP-123" },
      };

      const result = SaveScenarioHistorySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects exposure reduction over 100 percent", () => {
      const invalid = {
        scenarioType: "commute_mode",
        locationName: "Bengaluru",
        baselinePm25: 68.0,
        optimalPm25: 22.0,
        exposureReductionPct: 150.0, // Invalid > 100
        receiptPayload: {},
      };

      const result = SaveScenarioHistorySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// 2. Repository Authentication & Isolation Tests (Guest First Safety)
// ============================================================================
describe("Supabase Repository Authentication & Isolation", () => {
  const dummyPayload = {
    title: "Daily Plan for Mumbai",
    planDate: "2026-11-22",
    locationName: "Mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    primaryPollutant: "pm10",
    estimatedCpcbAqi: 180,
    cpcbCategory: "Moderate",
    actionsCount: 2,
    planPayload: { test: true },
    schemaVersion: 1,
  };

  it("returns 401 unauthenticated when no Supabase user session exists", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No active session" },
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const saveResult = await savePlanToCloud(mockClient, dummyPayload);
    expect(saveResult.success).toBe(false);
    expect(saveResult.statusCode).toBe(401);
    expect(saveResult.error).toContain("Authentication required");

    const getResult = await getSavedPlansFromCloud(mockClient);
    expect(getResult.success).toBe(false);
    expect(getResult.statusCode).toBe(401);

    const deleteResult = await deleteSavedPlanFromCloud(mockClient, "plan-123");
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.statusCode).toBe(401);
  });

  it("enforces authenticated user ownership on plan save", async () => {
    const mockAuthUser = { id: "user-uuid-123", email: "user@example.com" };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "plan-new-uuid", created_at: "2026-11-22T10:00:00Z" },
          error: null,
        }),
      }),
    });

    const mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
      from: mockFrom,
    } as unknown as SupabaseClient<Database>;

    const res = await savePlanToCloud(mockClient, dummyPayload);
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe("plan-new-uuid");

    // CRITICAL SECURITY CHECK: user_id sent to PostgreSQL MUST match auth session user.id
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-uuid-123",
        title: "Daily Plan for Mumbai",
        location_name: "Mumbai",
      })
    );
  });

  it("restricts plan deletion strictly to the calling user id", async () => {
    const mockAuthUser = { id: "user-uuid-456", email: "owner@example.com" };

    const mockEqUser = vi.fn().mockResolvedValue({ error: null });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: mockDelete,
      }),
    } as unknown as SupabaseClient<Database>;

    const res = await deleteSavedPlanFromCloud(mockClient, "target-plan-789");
    expect(res.success).toBe(true);

    // Verify both plan ID and user ID clauses are chained
    expect(mockEqId).toHaveBeenCalledWith("id", "target-plan-789");
    expect(mockEqUser).toHaveBeenCalledWith("user_id", "user-uuid-456");
  });

  it("saves and retrieves decision receipts under authenticated ownership", async () => {
    const mockAuthUser = { id: "user-uuid-789", email: "runner@example.com" };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "rcp-db-1", created_at: "2026-11-22T10:00:00Z" },
          error: null,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: "rcp-db-1", user_id: "user-uuid-789", receipt_id: "RCP-1" }],
          error: null,
        }),
      }),
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "decision_receipts") {
          return { insert: mockInsert, select: mockSelect };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const receiptPayload = {
      receiptId: "RCP-1",
      scenarioId: "SCN-1",
      scenarioLabel: "Window Opening Delay",
      timingSlot: "08:00 - 10:00",
      actionType: "ventilation",
      cpcbAqiBand: "Poor",
      hourlyPm25Estimate: 95.0,
      mitigationSteps: ["Keep windows closed during morning rush hour"],
    };

    const saveRes = await saveDecisionReceiptToCloud(mockClient, receiptPayload);
    expect(saveRes.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-uuid-789",
        receipt_id: "RCP-1",
      })
    );

    const getRes = await getSavedDecisionReceiptsFromCloud(mockClient);
    expect(getRes.success).toBe(true);
    expect(getRes.data).toHaveLength(1);
    expect(getRes.data?.[0].receipt_id).toBe("RCP-1");

    // Test delete receipt
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const mockClientWithDelete = {
      ...mockClient,
      from: vi.fn().mockReturnValue({ delete: mockDelete }),
    } as unknown as SupabaseClient<Database>;

    const deleteRes = await deleteDecisionReceiptFromCloud(mockClientWithDelete, "rcp-db-1");
    expect(deleteRes.success).toBe(true);
    expect(deleteRes.data?.deletedId).toBe("rcp-db-1");
  });

  it("records scenario history under authenticated ownership", async () => {
    const mockAuthUser = { id: "user-uuid-history", email: "history@example.com" };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "hist-1", created_at: "2026-11-22T10:00:00Z" },
          error: null,
        }),
      }),
    });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAuthUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as SupabaseClient<Database>;

    const historyPayload = {
      scenarioType: "purifier_mode",
      locationName: "Delhi",
      baselinePm25: 120.0,
      optimalPm25: 35.0,
      exposureReductionPct: 70.8,
      receiptPayload: { receiptId: "RCP-HIST-1" },
    };

    const res = await recordScenarioHistoryInCloud(mockClient, historyPayload);
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe("hist-1");
  });
});
