import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  SavePlanPayloadSchema,
  SaveDecisionReceiptSchema,
  SaveScenarioHistorySchema,
  type SavePlanPayload,
  type SaveDecisionReceiptPayload,
  type SaveScenarioHistoryPayload,
} from "./schemas";

export interface PersistenceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Saves a daily plan to the PostgreSQL saved_plans table.
 * Enforces authenticated session ownership and payload validation.
 */
export async function savePlanToCloud(
  supabase: SupabaseClient<Database>,
  payload: SavePlanPayload
): Promise<PersistenceResult<{ id: string; createdAt: string }>> {
  try {
    const validated = SavePlanPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return {
        success: false,
        error: `Invalid plan data: ${validated.error.issues.map((i) => i.message).join(", ")}`,
        statusCode: 400,
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to save plans to the cloud.",
        statusCode: 401,
      };
    }

    const planData = validated.data;
    const { data, error } = await supabase
      .from("saved_plans")
      .insert({
        user_id: authData.user.id,
        title: planData.title,
        plan_date: planData.planDate,
        location_name: planData.locationName,
        latitude: planData.latitude,
        longitude: planData.longitude,
        primary_pollutant: planData.primaryPollutant,
        estimated_cpcb_aqi: planData.estimatedCpcbAqi,
        cpcb_category: planData.cpcbCategory,
        actions_count: planData.actionsCount,
        plan_payload: planData.planPayload as unknown as Database["public"]["Tables"]["saved_plans"]["Insert"]["plan_payload"],
        schema_version: planData.schemaVersion,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: { id: data.id, createdAt: data.created_at },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while saving plan",
      statusCode: 500,
    };
  }
}

/**
 * Retrieves all saved plans for the authenticated user, ordered by creation date descending.
 */
export async function getSavedPlansFromCloud(
  supabase: SupabaseClient<Database>
): Promise<PersistenceResult<Array<Database["public"]["Tables"]["saved_plans"]["Row"]>>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to view cloud-saved plans.",
        statusCode: 401,
      };
    }

    const { data, error } = await supabase
      .from("saved_plans")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while fetching plans",
      statusCode: 500,
    };
  }
}

/**
 * Deletes a saved plan by ID. Strict RLS ensures users can only delete their own plans.
 */
export async function deleteSavedPlanFromCloud(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<PersistenceResult<{ deletedId: string }>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to delete cloud-saved plans.",
        statusCode: 401,
      };
    }

    const { error } = await supabase
      .from("saved_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", authData.user.id);

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: { deletedId: planId },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while deleting plan",
      statusCode: 500,
    };
  }
}

/**
 * Saves a Decision Receipt to the decision_receipts table.
 */
export async function saveDecisionReceiptToCloud(
  supabase: SupabaseClient<Database>,
  payload: SaveDecisionReceiptPayload
): Promise<PersistenceResult<{ id: string; createdAt: string }>> {
  try {
    const validated = SaveDecisionReceiptSchema.safeParse(payload);
    if (!validated.success) {
      return {
        success: false,
        error: `Invalid receipt data: ${validated.error.issues.map((i) => i.message).join(", ")}`,
        statusCode: 400,
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to save decision receipts to the cloud.",
        statusCode: 401,
      };
    }

    const receiptData = validated.data;
    const { data, error } = await supabase
      .from("decision_receipts")
      .insert({
        user_id: authData.user.id,
        receipt_id: receiptData.receiptId,
        scenario_id: receiptData.scenarioId,
        scenario_label: receiptData.scenarioLabel,
        timing_slot: receiptData.timingSlot,
        action_type: receiptData.actionType,
        cpcb_aqi_band: receiptData.cpcbAqiBand,
        hourly_pm25_estimate: receiptData.hourlyPm25Estimate,
        mitigation_steps: receiptData.mitigationSteps,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: { id: data.id, createdAt: data.created_at },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while saving decision receipt",
      statusCode: 500,
    };
  }
}

/**
 * Retrieves all decision receipts saved by the authenticated user.
 */
export async function getSavedDecisionReceiptsFromCloud(
  supabase: SupabaseClient<Database>
): Promise<PersistenceResult<Array<Database["public"]["Tables"]["decision_receipts"]["Row"]>>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to view decision receipts.",
        statusCode: 401,
      };
    }

    const { data, error } = await supabase
      .from("decision_receipts")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while fetching receipts",
      statusCode: 500,
    };
  }
}

/**
 * Deletes a decision receipt by ID.
 */
export async function deleteDecisionReceiptFromCloud(
  supabase: SupabaseClient<Database>,
  receiptDbId: string
): Promise<PersistenceResult<{ deletedId: string }>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to delete decision receipts.",
        statusCode: 401,
      };
    }

    const { error } = await supabase
      .from("decision_receipts")
      .delete()
      .eq("id", receiptDbId)
      .eq("user_id", authData.user.id);

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: { deletedId: receiptDbId },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while deleting decision receipt",
      statusCode: 500,
    };
  }
}

/**
 * Records a scenario calculation to scenario_history.
 */
export async function recordScenarioHistoryInCloud(
  supabase: SupabaseClient<Database>,
  payload: SaveScenarioHistoryPayload
): Promise<PersistenceResult<{ id: string; createdAt: string }>> {
  try {
    const validated = SaveScenarioHistorySchema.safeParse(payload);
    if (!validated.success) {
      return {
        success: false,
        error: `Invalid history data: ${validated.error.issues.map((i) => i.message).join(", ")}`,
        statusCode: 400,
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: "Authentication required to record scenario history.",
        statusCode: 401,
      };
    }

    const item = validated.data;
    const { data, error } = await supabase
      .from("scenario_history")
      .insert({
        user_id: authData.user.id,
        scenario_type: item.scenarioType,
        location_name: item.locationName,
        baseline_pm25: item.baselinePm25,
        optimal_pm25: item.optimalPm25,
        exposure_reduction_pct: item.exposureReductionPct,
        receipt_payload: item.receiptPayload as unknown as Database["public"]["Tables"]["scenario_history"]["Insert"]["receipt_payload"],
      })
      .select("id, created_at")
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
      };
    }

    return {
      success: true,
      data: { id: data.id, createdAt: data.created_at },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while recording scenario history",
      statusCode: 500,
    };
  }
}
