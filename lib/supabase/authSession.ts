import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Every write in the app is now authorized against auth.uid() (see
 * schema.sql), so a real session has to exist before anything is written —
 * Supabase's anonymous auth gives us that without any login screen: same
 * "type your name and go" flow as before, but backed by a session the
 * database can actually verify instead of a self-reported localStorage id.
 *
 * Memoized per tab (module-level, not per-call): this gets invoked from
 * every hydrate (join, page refresh, remount), and `signInAnonymously()`
 * always mints a brand-new auth user with no awareness of any session
 * already in flight. Without this cache, two overlapping calls (e.g. React
 * effects double-firing in dev mode) can each start a fresh anonymous
 * session — the second one silently orphans a player row's `user_id` from
 * the session the browser ends up actually using, so previously-created
 * rows stop being recognized as "yours" by RLS.
 */
let sessionPromise: Promise<string> | null = null;

export async function ensureAnonymousSession(
  supabase: SupabaseClient<Database>
): Promise<string> {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) return session.user.id;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      sessionPromise = null;
      throw error;
    }
    if (!data.user) {
      sessionPromise = null;
      throw new Error("Kon geen sessie starten. Probeer het opnieuw.");
    }

    return data.user.id;
  })();

  return sessionPromise;
}
