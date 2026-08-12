import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Catches the confirmation link Supabase emails after upgradeWithPassword
 * (see lib/supabase/accountAuth.ts) — updateUser({email, password}) on an
 * anonymous session doesn't flip is_anonymous to false until this link is
 * clicked. signInWithPassword and the OTP-code flow don't need this route;
 * they're immediate.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/community/mijn";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return Response.redirect(`${origin}${next}`);
  }

  return Response.redirect(`${origin}/community/mijn?accountConfirmError=1`);
}
