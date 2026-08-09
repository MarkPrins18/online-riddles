import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PuzzleDifficulty } from "@/types/puzzle";
import { upsertPack } from "@/lib/supabase/storyPacks";
import { insertPuzzles, type NewPuzzleInput } from "@/lib/supabase/puzzles";

const DIFFICULTIES: PuzzleDifficulty[] = ["easy", "medium", "hard"];

export type PuzzlePackPayload = {
  pack: {
    slug: string;
    name: string;
    theme: string;
    published?: boolean;
    /** Language every puzzle below is written in. Defaults to Dutch. */
    locale?: string;
  };
  puzzles: Array<{
    title: string;
    scenario: string;
    solution: string;
    category?: string;
    difficulty: string;
    hint?: string;
  }>;
};

/**
 * Validates a raw JSON payload before it touches the database. Collects
 * every problem instead of bailing on the first one, so an admin fixing a
 * JSON file sees the full list of what's wrong in one pass.
 */
export function validatePuzzlePackPayload(input: unknown): PuzzlePackPayload {
  const errors: string[] = [];
  const body = input as Partial<PuzzlePackPayload> | null;

  if (!body || typeof body !== "object") {
    throw new Error("Payload moet een JSON-object zijn.");
  }

  const pack = body.pack;
  if (!pack || typeof pack !== "object") {
    errors.push("`pack` ontbreekt of is geen object.");
  } else {
    if (!pack.slug || typeof pack.slug !== "string") {
      errors.push("`pack.slug` is verplicht (string, bijv. 'crime-vol-1').");
    }
    if (!pack.name || typeof pack.name !== "string") {
      errors.push("`pack.name` is verplicht (string).");
    }
    if (!pack.theme || typeof pack.theme !== "string") {
      errors.push("`pack.theme` is verplicht (string, bijv. 'Crime').");
    }
    if (pack.published !== undefined && typeof pack.published !== "boolean") {
      errors.push("`pack.published` moet true/false zijn als het is opgegeven.");
    }
    if (pack.locale !== undefined && typeof pack.locale !== "string") {
      errors.push("`pack.locale` moet een string zijn als het is opgegeven (bijv. 'nl' of 'en').");
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
      if (!puzzle.title || typeof puzzle.title !== "string") {
        errors.push(`${label}.title is verplicht (string).`);
      }
      if (!puzzle.scenario || typeof puzzle.scenario !== "string") {
        errors.push(`${label}.scenario is verplicht (string).`);
      }
      if (!puzzle.solution || typeof puzzle.solution !== "string") {
        errors.push(`${label}.solution is verplicht (string).`);
      }
      if (puzzle.category !== undefined && typeof puzzle.category !== "string") {
        errors.push(`${label}.category moet een string zijn als het is opgegeven.`);
      }
      if (puzzle.hint !== undefined && typeof puzzle.hint !== "string") {
        errors.push(`${label}.hint moet een string zijn als het is opgegeven.`);
      }
      if (!DIFFICULTIES.includes(puzzle.difficulty as PuzzleDifficulty)) {
        errors.push(
          `${label}.difficulty moet een van ${DIFFICULTIES.join(", ")} zijn, kreeg "${puzzle.difficulty}".`
        );
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Ongeldige puzzel-pack:\n- ${errors.join("\n- ")}`);
  }

  return body as PuzzlePackPayload;
}

export type ImportResult = {
  packId: string;
  packSlug: string;
  isPublished: boolean;
  totalInPayload: number;
  inserted: number;
  skippedAsDuplicate: number;
};

/**
 * Upserts the pack (by slug) and bulk-inserts its puzzles, skipping any
 * (pack, title) pair that already exists — safe to re-run the same file.
 */
export async function importPuzzlePack(
  supabase: SupabaseClient<Database>,
  payload: PuzzlePackPayload
): Promise<ImportResult> {
  const locale = payload.pack.locale ?? "nl";
  const pack = await upsertPack(supabase, {
    slug: payload.pack.slug,
    name: payload.pack.name,
    theme: payload.pack.theme,
    isPublished: payload.pack.published ?? false,
    locale,
  });
  const puzzleInputs: NewPuzzleInput[] = payload.puzzles.map((p) => ({
    title: p.title,
    scenario: p.scenario,
    solution: p.solution,
    category: p.category ?? payload.pack.theme,
    difficulty: p.difficulty as PuzzleDifficulty,
    hint: p.hint ?? null,
    locale,
  }));

  const inserted = await insertPuzzles(supabase, pack.id, puzzleInputs);

  return {
    packId: pack.id,
    packSlug: pack.slug,
    isPublished: pack.is_published,
    totalInPayload: puzzleInputs.length,
    inserted,
    skippedAsDuplicate: puzzleInputs.length - inserted,
  };
}
