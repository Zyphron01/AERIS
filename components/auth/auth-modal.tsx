"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Lock, Mail, UserCheck, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface AuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentUser: User | null;
  readonly onAuthSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}: AuthModalProps): React.JSX.Element | null {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const client = getSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      setErrorMessage("Supabase is not configured in client environment variables.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage("Signed in successfully!");
          onAuthSuccess?.();
          setTimeout(() => onClose(), 800);
        }
      } else {
        const { data, error } = await client.auth.signUp({
          email,
          password,
        });
        if (error) {
          setErrorMessage(error.message);
        } else if (data.session) {
          setSuccessMessage("Account created and signed in!");
          onAuthSuccess?.();
          setTimeout(() => onClose(), 800);
        } else {
          setSuccessMessage("Check your email for the confirmation link to complete registration.");
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      await client.auth.signOut();
      setSuccessMessage("Signed out successfully.");
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        {currentUser ? (
          /* User Profile & Sign Out View */
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-cyan-300">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 id="auth-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Cloud Account Connected
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-teal-200/80 bg-teal-50/60 p-4 text-xs text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-cyan-300">
              <p className="font-semibold">Cloud Sync Active</p>
              <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                Your saved action plans and decision receipts are synchronized to your private PostgreSQL instance under strict Row Level Security.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isLoading ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm dark:bg-cyan-500 dark:text-slate-950">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h2 id="auth-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {mode === "signin" ? "Sign In to AERIS Cloud" : "Create Cloud Account"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Optional persistence for plans and decision receipts.
                </p>
              </div>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="mt-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="auth-email-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-teal-700 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  {isLoading
                    ? "Processing..."
                    : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </div>
            </form>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              Guest mode is always enabled. Account creation is optional and gives you cross-device cloud persistence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
