import { createClient, SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Validate on client side only (not during build)
const isClient = typeof window !== "undefined";

if (isClient && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "Supabase environment variables are not configured. " +
    "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
  );
}

// Create a single supabase client for the browser
export const supabase: SupabaseClientType = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: isClient ? window.localStorage : undefined,
    },
  }
);

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://placeholder.supabase.co");
};

// Export for type inference
export type SupabaseClient = typeof supabase;
