/**
 * Supabase throws plain PostgrestError-shaped objects, not real `Error`
 * instances — so `err instanceof Error` silently misses them and falls
 * back to a generic message. This checks for `.message` on anything,
 * covering both real Errors and Supabase errors.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
