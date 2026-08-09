import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { translatePackName } from "@/lib/supabase/storyPacks";
import { translatePuzzles, type PuzzleTranslationInput } from "@/lib/supabase/puzzles";

export type PuzzlePackTranslationPayload = {
  pack: {
    /** Slug of the already-imported pack this translation attaches to — see packs/*.json. */
    slug: string;
    /** Language the name/puzzles below are written in (must differ from the pack's existing locale(s)). */
    locale: string;
    name: string;
  };
  puzzles: Array<{
    /** The existing Dutch title to match against — identifies which puzzle this translation belongs to. */
    matchTitle: string;
    title: string;
    scenario: string;
    solution: string;
    hint?: string;
  }>;
};

/**
 * Validates a raw JSON translation payload before it touches the database.
 * Collects every problem instead of bailing on the first one, so an admin
 * fixing a JSON file sees the full list of what's wrong in one pass.
 */
export function validatePuzzlePackTranslationPayload(input: unknown): PuzzlePackTranslationPayload {
  const errors: string[] = [];
  const body = input as Partial<PuzzlePackTranslationPayload> | null;

  if (!body || typeof body !== "object") {
    throw new Error("Payload moet een JSON-object zijn.");
  }

  const pack = body.pack;
  if (!pack || typeof pack !== "object") {
    errors.push("`pack` ontbreekt of is geen object.");
  } else {
    if (!pack.slug || typeof pack.slug !== "string") {
      errors.push("`pack.slug` is verplicht (string) — moet overeenkomen met een al geïmporteerde pack.");
    }
    if (!pack.locale || typeof pack.locale !== "string") {
      errors.push("`pack.locale` is verplicht (string, bijv. 'en').");
    }
    if (!pack.name || typeof pack.name !== "string") {
      errors.push("`pack.name` is verplicht (string).");
    }
  }

  const puzzles = body.puzzles;
  if (!Array.isArray(puzzles) || puzzles.length === 0) {
    errors.push("`puzzles` moet een niet-lege array zijn.");
  } else {
    puzzles.forEach((puzzle, index) => {
      const label = `puzzles[${index}]`;
      if (!puzzle || typeof puzzle !== "object") {
        errors.push(`${label} is geen object.`);
        return;
      }
      if (!puzzle.matchTitle || typeof puzzle.matchTitle !== "string") {
        errors.push(`${label}.matchTitle is verplicht (string) — de bestaande Nederlandse titel.`);
      }
      if (!puzzle.title || typeof puzzle.title !== "string") {
        errors.push(`${label}.title is verplicht (string).`);
      }
      if (!puzzle.scenario || typeof puzzle.scenario !== "string") {
        errors.push(`${label}.scenario is verplicht (string).`);
      }
      if (!puzzle.solution || typeof puzzle.solution !== "string") {
        errors.push(`${label}.solution is verplicht (string).`);
      }
      if (puzzle.hint !== undefined && typeof puzzle.hint !== "string") {
        errors.push(`${label}.hint moet een string zijn als het is opgegeven.`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Ongeldige vertaling:\n- ${errors.join("\n- ")}`);
  }

  return body as PuzzlePackTranslationPayload;
}

export type TranslateResult = {
  packSlug: string;
  locale: string;
  totalInPayload: number;
  translated: number;
  skippedNoMatch: number;
};

/**
 * Attaches a translation (pack name + puzzle text) to an already-imported
 * pack, matched by the pack's slug and each puzzle's existing Dutch title.
 * Never creates a new pack or puzzle — see translatePuzzles/translatePackName
 * for why this is a separate path from importPuzzlePack.
 */
export async function translatePuzzlePack(
  supabase: SupabaseClient<Database>,
  payload: PuzzlePackTranslationPayload
): Promise<TranslateResult> {
  const { data: pack, error } = await supabase
    .from("story_packs")
    .select("id")
    .eq("slug", payload.pack.slug)
    .single();

  if (error) throw error;

  await translatePackName(supabase, pack.id, payload.pack.locale, payload.pack.name);

  const entries: PuzzleTranslationInput[] = payload.puzzles.map((p) => ({
    matchTitle: p.matchTitle,
    title: p.title,
    scenario: p.scenario,
    solution: p.solution,
    hint: p.hint ?? null,
  }));

  const translated = await translatePuzzles(supabase, pack.id, payload.pack.locale, entries);

  return {
    packSlug: payload.pack.slug,
    locale: payload.pack.locale,
    totalInPayload: entries.length,
    translated,
    skippedNoMatch: entries.length - translated,
  };
}
