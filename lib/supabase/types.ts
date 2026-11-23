export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      saved_plans: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          plan_date: string;
          location_name: string;
          latitude: number;
          longitude: number;
          primary_pollutant: string;
          estimated_cpcb_aqi: number;
          cpcb_category: string;
          actions_count: number;
          plan_payload: Json;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          plan_date: string;
          location_name: string;
          latitude: number;
          longitude: number;
          primary_pollutant: string;
          estimated_cpcb_aqi: number;
          cpcb_category: string;
          actions_count?: number;
          plan_payload: Json;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          plan_date?: string;
          location_name?: string;
          latitude?: number;
          longitude?: number;
          primary_pollutant?: string;
          estimated_cpcb_aqi?: number;
          cpcb_category?: string;
          actions_count?: number;
          plan_payload?: Json;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decision_receipts: {
        Row: {
          id: string;
          user_id: string;
          receipt_id: string;
          scenario_id: string;
          scenario_label: string;
          timing_slot: string;
          action_type: string;
          cpcb_aqi_band: string;
          hourly_pm25_estimate: number;
          mitigation_steps: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          receipt_id: string;
          scenario_id: string;
          scenario_label: string;
          timing_slot: string;
          action_type: string;
          cpcb_aqi_band: string;
          hourly_pm25_estimate: number;
          mitigation_steps?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          receipt_id?: string;
          scenario_id?: string;
          scenario_label?: string;
          timing_slot?: string;
          action_type?: string;
          cpcb_aqi_band?: string;
          hourly_pm25_estimate?: number;
          mitigation_steps?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      scenario_history: {
        Row: {
          id: string;
          user_id: string;
          scenario_type: string;
          location_name: string;
          baseline_pm25: number;
          optimal_pm25: number;
          exposure_reduction_pct: number;
          receipt_payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scenario_type: string;
          location_name: string;
          baseline_pm25: number;
          optimal_pm25: number;
          exposure_reduction_pct: number;
          receipt_payload: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scenario_type?: string;
          location_name?: string;
          baseline_pm25?: number;
          optimal_pm25?: number;
          exposure_reduction_pct?: number;
          receipt_payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
