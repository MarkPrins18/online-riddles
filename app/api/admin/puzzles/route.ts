import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { validatePuzzlePackPayload, importPuzzlePack } from "@/lib/admin/importPuzzlePack";
import { listPacksWithPuzzleCounts } from "@/lib/supabase/storyPacks";
import { getErrorMessage } from "@/lib/errors";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_IMPORT_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

/**
 * POST a puzzle-pack JSON body (see /packs/example-pack.json for the shape)
 * with header `x-admin-secret: <ADMIN_IMPORT_SECRET>` to upsert a pack and
 * bulk-import its puzzles. Safe to re-run: duplicate (pack, title) pairs are
 * skipped and pack metadata is updated in place.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body moet geldige JSON zijn." }, { status: 400 });
  }

  try {
    const payload = validatePuzzlePackPayload(body);
    const admin = createAdminClient();
    const result = await importPuzzlePack(admin, payload);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error, "Onbekende fout bij importeren.");
    return Response.json({ error: message }, { status: 400 });
  }
}

/** Lists story packs with their puzzle counts and publish state. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // Admin tooling, not a player-facing page — no UI locale to read here, so
  // this always shows the Dutch name regardless of which locales the pack
  // has been translated into.
  const packs = await listPacksWithPuzzleCounts(admin, "nl");
  return Response.json({ packs });
}
