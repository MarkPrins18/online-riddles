/**
 * Attach a translation to an already-imported puzzle pack.
 *
 * Usage:
 *   npm run puzzles:translate -- packs/translations/crime-originals-vol1.en.json
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL, loaded
 * from .env.local. The target pack (by slug) must already exist — run
 * puzzles:import first. See packs/translations/*.json for the expected
 * JSON shape.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin-client";
import { validatePuzzlePackTranslationPayload, translatePuzzlePack } from "../lib/admin/translatePuzzlePack";
import { getErrorMessage } from "../lib/errors";

try {
  process.loadEnvFile(resolve(process.cwd(), ".env.local"));
} catch {
  // No .env.local — fine if the environment already has the vars set.
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Gebruik: npm run puzzles:translate -- <pad-naar-vertaling.json>");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  const raw = await readFile(filePath, "utf-8");
  const payload = validatePuzzlePackTranslationPayload(JSON.parse(raw));

  const supabase = createAdminClient();
  const result = await translatePuzzlePack(supabase, payload);

  console.log(`Pack "${result.packSlug}" vertaald naar "${result.locale}"`);
  console.log(`  ${result.translated} puzzel(s) vertaald`);
  if (result.skippedNoMatch > 0) {
    console.log(`  ${result.skippedNoMatch} overgeslagen (geen matchende Nederlandse titel gevonden)`);
  }
}

main().catch((error) => {
  console.error(getErrorMessage(error, String(error)));
  process.exit(1);
});
