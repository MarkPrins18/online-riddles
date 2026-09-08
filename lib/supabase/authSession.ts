import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Every write in the app is now authorized against auth.uid() (see
 * schema.sql), so a real session has to exist before anything is written —
 * Supabase's anonymous auth gives us that without any login screen: same
 * "type your name and go" flow as before, but backed by a session the
 * database can actually verify instead of a self-reported localStorage id.
 *
 * `getSession()` is always checked fresh (it reads the SDK's local session
 * state, no network round-trip) so this reflects the *current* session even
 * after it changes mid-page-life — e.g. verifying an email code swaps an
 * anonymous session for a permanent account under the same tab. Returning a
 * stale cached id there would send writes with an `id` that no longer
 * matches `auth.uid()`, failing RLS.
 *
 * Only the "no session yet" branch is memoized (module-level, not
 * per-call): `signInAnonymously()` always mints a brand-new auth user with
 * no awareness of any session already in flight, so two overlapping calls
 * (e.g. React effects double-firing in dev mode) can each start a fresh
 * anonymous session — the second one would silently orphan a player row's
 * `user_id` from the session the browser ends up actually using. The
 * in-flight promise is cleared once it settles, so the next call re-checks
 * the now-real session instead of replaying a stale result forever.
 */
let signInPromise: Promise<string> | null = null;

export async function ensureAnonymousSession(
  supabase: SupabaseClient<Database>
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) return session.user.id;

  if (signInPromise) return signInPromise;

  signInPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (!data.user) throw new Error("Kon geen sessie starten. Probeer het opnieuw.");
      return data.user.id;
    } finally {
      signInPromise = null;
    }
  })();

  return signInPromise;
}
