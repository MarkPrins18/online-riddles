import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type Client = SupabaseClient<Database>;

export type AccountStatus = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

/**
 * Server-verified read of who the caller currently is (getUser, not
 * getSession, since only getUser re-checks the token against Supabase
 * instead of trusting whatever is cached locally). Returns null if there's
 * no session yet at all — callers that need one should ensureAnonymousSession
 * first.
 */
export async function getAccountStatus(supabase: Client): Promise<AccountStatus | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    isAnonymous: data.user.is_anonymous ?? true,
  };
}

/**
 * First-time upgrade: attaches email+password to the CURRENT anonymous
 * session, preserving its auth.uid() (and therefore every created_by row
 * already tied to it). Supabase requires the emailed confirmation link to
 * be clicked before is_anonymous actually flips to false — see
 * app/auth/confirm/route.ts, which emailRedirectTo must point at.
 */
export async function upgradeWithPassword(
  supabase: Client,
  email: string,
  password: string,
  emailRedirectTo: string
): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email, password }, { emailRedirectTo });
  if (error) throw error;
}

/**
 * Returning user on a new browser/device: signs in to an existing
 * permanent account, replacing whatever anonymous session is active in
 * this tab. Immediate — no email confirmation step.
 */
export async function signInWithPassword(
  supabase: Client,
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Step 1 of the passwordless flow: emails a 6-digit code. Works for both
 * upgrading the current anonymous session and returning-user login —
 * Supabase decides server-side (at verify time) whether the email already
 * owns a permanent account.
 */
export async function requestEmailCode(supabase: Client, email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/**
 * Step 2: verifies the 6-digit code. Immediate — either links this email to
 * the current anonymous session (new email) or signs in to the pre-existing
 * account for it (replacing any anon session).
 */
export async function verifyEmailCode(
  supabase: Client,
  email: string,
  token: string
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

/**
 * Only call this once the caller has confirmed the session is not
 * anonymous — signing out an anonymous user deletes it server-side and
 * silently drops whatever content it owned.
 */
export async function signOut(supabase: Client): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
