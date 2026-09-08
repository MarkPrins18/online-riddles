import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Stateless anon-key client for server contexts that only ever read public,
 * RLS-open data (sitemap generation, page `generateMetadata`) — no request
 * cookies involved, so callers reading with this stay cacheable instead of
 * opting into per-request dynamic rendering just to read rows anyone could
 * already see anonymously.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
