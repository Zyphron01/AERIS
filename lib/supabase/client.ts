import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Resolves Supabase credentials from client environment variables.
 * Supports both standard NEXT_PUBLIC_SUPABASE_ANON_KEY and the modern
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

/**
 * Returns a singleton Supabase browser client configured with RLS-compliant
 * public credentials. Returns null if environment variables are not configured.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (browserClient) {
    return browserClient;
  }

  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return null;
  }

  browserClient = createClient<Database>(credentials.url, credentials.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
