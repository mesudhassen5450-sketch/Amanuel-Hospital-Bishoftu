import { createClient } from "@supabase/supabase-js";

// import.meta.env is injected by Vite at build/dev time (browser + SSR bundles).
// Fall back to empty strings so the SSR boot doesn't throw before reaching the
// browser where the real values are always present.
const supabaseUrl: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  "";

const supabaseAnonKey: string =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
  "";

/**
 * True only when real Supabase credentials are present.
 * Use this to skip Supabase calls (queries + Realtime subscriptions) when the
 * app is running without a configured .env, preventing ERR_NAME_NOT_RESOLVED
 * console spam from hitting the placeholder URL.
 */
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes("placeholder") &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "placeholder";

if (!isSupabaseConfigured) {
  // Warn once instead of throwing — a module-level throw here crashes the SSR
  // server entry before any route renders, producing a blank 500.
  console.warn(
    "[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
      "Open .env and fill in your Supabase project credentials, then restart the dev server."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: isSupabaseConfigured,
      // Disable Web Locks API to prevent Navigator LockManager errors in Firefox
      // @ts-ignore - Supabase types don't correctly reflect that false is valid
      lock: false,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  }
);

// Immediately disconnect the Realtime WebSocket when credentials are missing.
// Without this the client auto-connects and floods the console with
// ERR_NAME_NOT_RESOLVED retries against the placeholder hostname.
if (!isSupabaseConfigured) {
  supabase.realtime.disconnect();
}
