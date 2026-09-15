/**
 * Lint every puzzle pack in `packs/*.json` (and its EN translation, if any)
 * without touching Supabase — catches content-schema mistakes before they
 * reach `puzzles:import`/`puzzles:translate`.
 *
 * Usage:
 *   npm run puzzles:verify
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validatePuzzlePackPayload } from "../lib/admin/importPuzzlePack";
import { validatePuzzlePackTranslationPayload } from "../lib/admin/translatePuzzlePack";
import { getErrorMessage } from "../lib/errors";

const PACKS_DIR = resolve(process.cwd(), "packs");
const TRANSLATIONS_DIR = resolve(PACKS_DIR, "translations");

const TITLE_MAX_WORDS = 3;
const TITLE_MAX_CHARS = 30;
const SCENARIO_MAX_WORDS = 30;
const SCENARIO_MAX_CLAUSES = 2;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clauseCount(text: string): number {
  return (text.match(/[,;]/g) ?? []).length;
}

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  const entries = await readdir(PACKS_DIR, { withFileTypes: true });
  const packFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  if (packFiles.length === 0) {
    console.error(`Geen packbestanden gevonden in ${PACKS_DIR}`);
    process.exit(1);
  }

  const titlesAcrossPacks = new Map<string, string>(); // title -> pack slug it first appeared in

  for (const fileName of packFiles) {
    const filePath = resolve(PACKS_DIR, fileName);
    const raw = await readFile(filePath, "utf-8");

    let payload;
    try {
      payload = validatePuzzlePackPayload(JSON.parse(raw));
    } catch (error) {
      errors.push(`${fileName}: ${getErrorMessage(error, String(error))}`);
      continue;
    }

    const slug = payload.pack.slug;
    const titlesInPack = new Set<string>();
    const difficultyCounts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

    for (const puzzle of payload.puzzles) {
      const label = `${fileName} / "${puzzle.title}"`;

      if (titlesInPack.has(puzzle.title)) {
        errors.push(`${label}: dubbele titel binnen dit pack.`);
      }
      titlesInPack.add(puzzle.title);

      const existingOwner = titlesAcrossPacks.get(puzzle.title);
      if (existingOwner && existingOwner !== slug) {
        warnings.push(`${label}: titel komt ook voor in pack "${existingOwner}".`);
      }
      titlesAcrossPacks.set(puzzle.title, slug);

      if (wordCount(puzzle.title) > TITLE_MAX_WORDS || puzzle.title.length > TITLE_MAX_CHARS) {
        warnings.push(
          `${label}: titel is lang (${wordCount(puzzle.title)} woorden, ${puzzle.title.length} tekens) — richtlijn is 1-3 woorden.`
        );
      }

      const scenarioWords = wordCount(puzzle.scenario);
      if (scenarioWords > SCENARIO_MAX_WORDS) {
        warnings.push(`${label}: scenario is lang (${scenarioWords} woorden) — richtlijn is 10-25 woorden.`);
      }
      if (clauseCount(puzzle.scenario) > SCENARIO_MAX_CLAUSES) {
        warnings.push(
          `${label}: scenario heeft veel bijzinnen (${clauseCount(puzzle.scenario)} komma's/puntkomma's) — mogelijk al een verklaring aan het voorschotelen in plaats van een kaal feit.`
        );
      }

      difficultyCounts[puzzle.difficulty] = (difficultyCounts[puzzle.difficulty] ?? 0) + 1;
    }

    const total = payload.puzzles.length;
    for (const [tier, count] of Object.entries(difficultyCounts)) {
      if (count === 0) {
        warnings.push(`${fileName}: geen enkele "${tier}"-puzzel.`);
      } else if (count / total > 0.5) {
        warnings.push(`${fileName}: "${tier}" is ${count}/${total} van het pack (>50%).`);
      }
    }

    // Cross-check against the EN translation file, if one exists for this pack.
    const translationPath = resolve(TRANSLATIONS_DIR, `${slug}.en.json`);
    let translationRaw: string | null = null;
    try {
      translationRaw = await readFile(translationPath, "utf-8");
    } catch {
      // No EN translation yet — not an error, just nothing to cross-check.
    }

    if (translationRaw) {
      let translationPayload;
      try {
        translationPayload = validatePuzzlePackTranslationPayload(JSON.parse(translationRaw));
      } catch (error) {
        errors.push(`${slug}.en.json: ${getErrorMessage(error, String(error))}`);
        continue;
      }

      const nlTitles = new Set(payload.puzzles.map((p) => p.title));
      const matchTitles = new Set(translationPayload.puzzles.map((p) => p.matchTitle));

      for (const nlTitle of nlTitles) {
        if (!matchTitles.has(nlTitle)) {
          errors.push(`${slug}: NL-titel "${nlTitle}" heeft geen matchende entry in ${slug}.en.json.`);
        }
      }
      for (const matchTitle of matchTitles) {
        if (!nlTitles.has(matchTitle)) {
          errors.push(
            `${slug}.en.json: matchTitle "${matchTitle}" komt niet (meer) voor als NL-titel in ${fileName} — vertaling is losgeraakt na een titelwijziging.`
          );
        }
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`${warnings.length} waarschuwing(en):`);
    for (const warning of warnings) console.warn(`  - ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} fout(en):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`\nAlle ${packFiles.length} packbestanden zijn geldig.`);
}

main().catch((error) => {
  console.error(getErrorMessage(error, String(error)));
  process.exit(1);
});
