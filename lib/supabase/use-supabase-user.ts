"use client";

import { useState, useEffect, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

export interface SupabaseUserState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
}

/**
 * React hook subscribing to Supabase client auth state.
 * Gracefully defaults to unauthenticated guest mode if Supabase is not configured
 * or if no user is signed in.
 */
export function useSupabaseUser(): SupabaseUserState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isConfigured] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!getSupabaseBrowserClient();
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!getSupabaseBrowserClient();
  });

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    let isMounted = true;

    // Initial session load
    client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (client) {
      await client.auth.signOut();
      setUser(null);
      setSession(null);
    }
  }, []);

  return {
    user,
    session,
    isLoading,
    isConfigured,
    signOut,
  };
}
