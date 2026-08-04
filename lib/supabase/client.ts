import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Client-side Supabase instance. Uses the anon key only — RLS
 * restricts this to inserting registrations, nothing else.
 */
export function createClient() {
  // Fallback placeholders let the client construct during Next.js's
  // build-time prerender pass for pages that don't set real env vars
  // yet; real requests always run with NEXT_PUBLIC_SUPABASE_URL /
  // NEXT_PUBLIC_SUPABASE_ANON_KEY set in the deployment environment.
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );
}
