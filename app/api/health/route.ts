import { createAdminClient } from "@/lib/supabase/admin-client";
import { getErrorMessage } from "@/lib/errors";

// A liveness/readiness signal for uptime monitors — never cache this.
export const dynamic = "force-dynamic";

/** Confirms the app can reach the database. No auth: safe to expose, read-only. */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("rooms")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) throw error;

    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { status: "error", error: getErrorMessage(error, "Unknown error") },
      { status: 503 }
    );
  }
}
