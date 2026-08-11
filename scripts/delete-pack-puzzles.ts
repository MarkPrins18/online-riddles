/**
 * Deletes every puzzle in a pack, so it can be re-imported with replacement
 * content. Does not delete the pack itself (name/theme/publish state stay).
 *
 * Usage:
 *   npm run puzzles:delete -- <pack-slug>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL, loaded
 * from .env.local. Fails if any of the pack's puzzles is still referenced
 * by an active room (questions/guesses/hints) — wait for that room to clear
 * or handle it manually before retrying.
 */
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin-client";
import { deletePuzzlePack } from "../lib/admin/deletePuzzlePack";
import { getErrorMessage } from "../lib/errors";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env.local"));
} catch {
  // No .env.local — fine if the environment already has the vars set.
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Gebruik: npm run puzzles:delete -- <pack-slug>");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const result = await deletePuzzlePack(supabase, slug);

  console.log(`Pack "${result.packSlug}"`);
  console.log(`  ${result.deleted} puzzel(s) verwijderd`);
}

main().catch((error) => {
  console.error(getErrorMessage(error, String(error)));
  process.exit(1);
});
