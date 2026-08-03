/**
 * Bulk-import a puzzle pack from a JSON file straight into Supabase.
 *
 * Usage:
 *   npm run puzzles:import -- packs/example-pack.json
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL, loaded
 * from .env.local. See packs/example-pack.json for the expected JSON shape.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin-client";
import { validatePuzzlePackPayload, importPuzzlePack } from "../lib/admin/importPuzzlePack";
import { getErrorMessage } from "../lib/errors";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env.local"));
} catch {
  // No .env.local — fine if the environment already has the vars set.
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Gebruik: npm run puzzles:import -- <pad-naar-pack.json>");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  const raw = await readFile(filePath, "utf-8");
  const payload = validatePuzzlePackPayload(JSON.parse(raw));

  const supabase = createAdminClient();
  const result = await importPuzzlePack(supabase, payload);

  console.log(`Pack "${result.packSlug}" (${result.isPublished ? "gepubliceerd" : "concept"})`);
  console.log(`  ${result.inserted} nieuwe puzzel(s) toegevoegd`);
  if (result.skippedAsDuplicate > 0) {
    console.log(`  ${result.skippedAsDuplicate} overgeslagen (bestonden al in deze pack)`);
  }
}

main().catch((error) => {
  console.error(getErrorMessage(error, String(error)));
  process.exit(1);
});
