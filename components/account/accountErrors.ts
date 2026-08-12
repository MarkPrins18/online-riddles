import { getErrorMessage } from "@/lib/errors";

const KNOWN_CODES = new Set([
  "email_exists",
  "user_already_exists",
  "invalid_credentials",
  "otp_expired",
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "weak_password",
  "email_address_invalid",
  "same_password",
]);

/**
 * Supabase's AuthError carries a stable `.code` — mapped here to
 * translated copy via next-intl's `t` (scoped to the "AccountErrors"
 * namespace, flat keys matching KNOWN_CODES plus "generic"). Codes without
 * a translation, and plain network failures (no `.code` at all), fall back
 * to getErrorMessage's raw-message-or-fallback behavior, same as every
 * other form in the app.
 */
export function describeAccountError(error: unknown, t: (key: string) => string): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && KNOWN_CODES.has(code)) {
    return t(code);
  }
  return getErrorMessage(error, t("generic"));
}
