import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { getSupabaseCredentials } from "./client";

/**
 * Server-side Supabase client for Server Components, Server Actions,
 * and Route Handlers with secure cookie handling.
 */
export async function getSupabaseServerClient() {
  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(credentials.url, credentials.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}
