import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Puzzle, PuzzlePreview, PublishedPuzzle, PuzzleCandidate, PuzzleDifficulty } from "@/types/puzzle";
import { getVoteTotals } from "./votes";
import { resolveCategoryId } from "./categories";

type Client = SupabaseClient<Database>;

// A puzzle needs at least this many votes before its score is trusted for
// anything — below that, a couple of noisy votes (one grumpy friend, one
// biased upvote) would swing it unfairly, and a brand-new puzzle would
// otherwise never get drawn to collect votes in the first place. Only used
// to filter out a clear consensus of "this one's bad" (score at or below
// the threshold), not to boost highly-rated puzzles — with typical vote
// counts that ranking signal is too noisy to act on constructively.
const MIN_VOTES_TO_TRUST_SCORE = 5;
const BAD_SCORE_THRESHOLD = -3;

/**
 * Only pulls from packs that have been published — see
 * get_published_puzzle_candidates in schema.sql. That RPC deliberately
 * returns just enough per puzzle (id, pack_id, theme, difficulty,
 * is_community) to run the filter cascade below, not each candidate's full
 * title/scenario/solution/hint — fetching every published puzzle's full
 * text just to throw away all but one of them doesn't scale as the catalog
 * grows. Once the cascade has picked a single winner, get_published_puzzle
 * fetches that one puzzle's real content (with locale fallback to Dutch,
 * same as before).
 *
 * Excludes `excludeIds` (puzzles this room already played) so a game night
 * doesn't repeat a riddle everyone already knows the answer to; falls back
 * to the full pool once every puzzle has been used. `officialThemes`
 * restricts non-community puzzles to those pack themes (empty = no
 * restriction); `communityPackIds` restricts community puzzles to those
 * specific packs (null = every published community pack, [] = none).
 * `preferredDifficulty` further narrows the result to match the round's
 * target difficulty (see lib/game/difficulty.ts) — every filter falls back
 * to the wider pool if the narrowed set happens to be empty, rather than
 * blocking the game over a combination with zero puzzles.
 */
export async function getRandomPuzzle(
  supabase: Client,
  locale: string,
  excludeIds: string[] = [],
  officialThemes: string[] = [],
  communityPackIds: string[] | null = null,
  preferredDifficulty?: PuzzleDifficulty
): Promise<PuzzlePreview> {
  const { data, error } = await supabase.rpc("get_published_puzzle_candidates");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Geen gepubliceerde puzzels beschikbaar.");
  }

  const puzzles = data as PuzzleCandidate[];
  const themeFiltered = puzzles.filter((p) =>
    p.is_community
      ? communityPackIds === null || communityPackIds.includes(p.pack_id)
      : officialThemes.length === 0 || officialThemes.includes(p.theme)
  );
  const themeCandidates = themeFiltered.length > 0 ? themeFiltered : puzzles;

  const difficultyFiltered = preferredDifficulty
    ? themeCandidates.filter((p) => p.difficulty === preferredDifficulty)
    : themeCandidates;
  const candidates = difficultyFiltered.length > 0 ? difficultyFiltered : themeCandidates;

  const voteTotals = await getVoteTotals(
    supabase,
    candidates.map((p) => p.id)
  );
  const wellRated = candidates.filter((p) => {
    const totals = voteTotals.get(p.id);
    if (!totals) return true;
    const voteCount = totals.upvotes + totals.downvotes;
    return voteCount < MIN_VOTES_TO_TRUST_SCORE || totals.score > BAD_SCORE_THRESHOLD;
  });
  const ratingFiltered = wellRated.length > 0 ? wellRated : candidates;

  const unplayed = ratingFiltered.filter((p) => !excludeIds.includes(p.id));
  const pool = unplayed.length > 0 ? unplayed : ratingFiltered;

  const picked = pool[Math.floor(Math.random() * pool.length)];

  const { data: puzzleRows, error: puzzleError } = await supabase.rpc("get_published_puzzle", {
    puzzle_id_input: picked.id,
    locale_input: locale,
  });
  if (puzzleError) throw puzzleError;
  if (!puzzleRows || puzzleRows.length === 0) {
    // Vanishingly rare: the picked puzzle's pack got unpublished in the
    // gap between the two fetches. Not worth a retry loop for — surface
    // the same "try again" path an empty candidate pool already has.
    throw new Error("Geen gepubliceerde puzzels beschikbaar.");
  }

  const pickedFull = puzzleRows[0] as PublishedPuzzle;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop theme, the only field get_published_puzzle adds over Puzzle
  const { theme, ...puzzle } = pickedFull;
  return puzzle;
}

/**
 * Looks up a room's current puzzle via the get_room_puzzle RPC, which nulls
 * out the solution server-side unless the caller is the room's narrator or
 * the round has already been revealed — the client never receives the
 * solution it isn't allowed to see. `locale` picks which translation comes
 * back (falling back to Dutch server-side, same as get_published_puzzles).
 */
export async function getRoomPuzzle(
  supabase: Client,
  roomId: string,
  locale: string = "nl"
): Promise<Puzzle | null> {
  const { data, error } = await supabase.rpc("get_room_puzzle", {
    room_id_input: roomId,
    locale_input: locale,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

type RawPuzzleRow = {
  id: string;
  pack_id: string;
  category_id: string | null;
  difficulty: PuzzleDifficulty;
  created_at: string;
  created_by: string | null;
  is_community: boolean;
};

/**
 * Joins bare `puzzles` rows (no title/scenario/solution/hint — those never
 * lived there) against their translations and category names, resolved for
 * `locale` with a fallback to whatever translation the puzzle *does* have
 * (first Dutch, then anything) — unlike get_published_puzzles/get_room_puzzle
 * this covers puzzles from unpublished/community packs too, so it can't
 * assume every puzzle already has a Dutch row. Used by the community "mine"
 * pages, which query `puzzles` directly (RLS already lets a creator see
 * their own unpublished content, no need to go through the published-only
 * RPCs). `includeSolution: false` skips selecting the solution column
 * entirely for public-preview call sites — defense in depth, on the query
 * rather than left to the UI to not render it.
 */
export async function hydratePuzzles(
  supabase: Client,
  rows: RawPuzzleRow[],
  locale: string,
  includeSolution: boolean
): Promise<Puzzle[]> {
  if (rows.length === 0) return [];

  const puzzleIds = rows.map((r) => r.id);
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((id): id is string => !!id))];

  // includeSolution: false reads from puzzle_translations_public (a view
  // that never exposes solution at all, see schema.sql) rather than just
  // omitting the column from the select — the base table has no public
  // read policy anymore, so a select against it here would return zero
  // rows for anyone but the puzzle's own creator/an admin.
  const { data: translations, error: translationsError } = includeSolution
    ? await supabase
        .from("puzzle_translations")
        .select("puzzle_id, locale, title, scenario, solution, hint")
        .in("puzzle_id", puzzleIds)
    : await supabase
        .from("puzzle_translations_public")
        .select("puzzle_id, locale, title, scenario, hint")
        .in("puzzle_id", puzzleIds);
  if (translationsError) throw translationsError;

  const categoryTranslations =
    categoryIds.length === 0
      ? []
      : await (async () => {
          const { data, error } = await supabase
            .from("category_translations")
            .select("category_id, locale, name")
            .in("category_id", categoryIds);
          if (error) throw error;
          return data ?? [];
        })();

  type TranslationRow = { puzzle_id: string; locale: string; title: string; scenario: string; solution?: string; hint: string | null };

  const translationsByPuzzle = new Map<string, TranslationRow[]>();
  for (const row of (translations ?? []) as TranslationRow[]) {
    const list = translationsByPuzzle.get(row.puzzle_id) ?? [];
    list.push(row);
    translationsByPuzzle.set(row.puzzle_id, list);
  }

  const categoryNamesById = new Map<string, Map<string, string>>();
  for (const row of categoryTranslations as Array<{ category_id: string; locale: string; name: string }>) {
    const byLocale = categoryNamesById.get(row.category_id) ?? new Map<string, string>();
    byLocale.set(row.locale, row.name);
    categoryNamesById.set(row.category_id, byLocale);
  }

  function pickTranslation(puzzleId: string): TranslationRow | null {
    const candidates = translationsByPuzzle.get(puzzleId) ?? [];
    return (
      candidates.find((t) => t.locale === locale) ??
      candidates.find((t) => t.locale === "nl") ??
      candidates[0] ??
      null
    );
  }

  function pickCategoryName(categoryId: string | null): string | null {
    if (!categoryId) return null;
    const byLocale = categoryNamesById.get(categoryId);
    if (!byLocale) return null;
    return byLocale.get(locale) ?? byLocale.get("nl") ?? [...byLocale.values()][0] ?? null;
  }

  return rows.flatMap((row) => {
    const translation = pickTranslation(row.id);
    if (!translation) return [];
    return [
      {
        id: row.id,
        pack_id: row.pack_id,
        title: translation.title,
        scenario: translation.scenario,
        solution: translation.solution ?? "",
        category: pickCategoryName(row.category_id),
        category_id: row.category_id,
        difficulty: row.difficulty,
        hint: translation.hint,
        created_at: row.created_at,
        created_by: row.created_by,
        is_community: row.is_community,
        locale: translation.locale,
      },
    ];
  });
}

export type NewPuzzleInput = {
  title: string;
  scenario: string;
  solution: string;
  category?: string | null;
  difficulty: Puzzle["difficulty"];
  hint?: string | null;
  /** Language the title/scenario/solution/hint above are written in. Defaults to Dutch, matching every existing pack file. */
  locale?: string;
};

/**
 * Bulk-imports puzzles into a pack. Idempotent: re-running with the same
 * (pack, locale, title) triples skips duplicates instead of erroring —
 * checked in application code rather than a DB constraint, since
 * puzzle_translations has no (pack, title) unique index (it would need
 * pack_id duplicated onto it just for that). Category names are resolved
 * (and created if new) via resolveCategoryId — only safe here because this
 * runs with the service-role key, which bypasses the RLS that otherwise
 * keeps `categories`/`category_translations` admin-write-only.
 */
export async function insertPuzzles(
  supabase: Client,
  packId: string,
  puzzles: NewPuzzleInput[]
): Promise<number> {
  if (puzzles.length === 0) return 0;

  const categoryIds = new Map<string, string>();
  for (const p of puzzles) {
    if (p.category && !categoryIds.has(p.category)) {
      categoryIds.set(p.category, await resolveCategoryId(supabase, p.category, p.locale ?? "nl"));
    }
  }

  const { data: existingPuzzleIds, error: puzzleIdsError } = await supabase
    .from("puzzles")
    .select("id")
    .eq("pack_id", packId);

  if (puzzleIdsError) throw puzzleIdsError;

  const existingKeys = new Set<string>();
  if (existingPuzzleIds && existingPuzzleIds.length > 0) {
    const { data: existingTranslations, error: existingError } = await supabase
      .from("puzzle_translations")
      .select("locale, title")
      .in(
        "puzzle_id",
        existingPuzzleIds.map((p) => p.id)
      );

    if (existingError) throw existingError;
    for (const row of existingTranslations ?? []) {
      existingKeys.add(`${row.locale}::${row.title}`);
    }
  }

  let inserted = 0;
  for (const p of puzzles) {
    const locale = p.locale ?? "nl";
    if (existingKeys.has(`${locale}::${p.title}`)) continue;

    const { data: puzzle, error: puzzleError } = await supabase
      .from("puzzles")
      .insert({
        pack_id: packId,
        category_id: p.category ? (categoryIds.get(p.category) ?? null) : null,
        difficulty: p.difficulty,
      })
      .select("id")
      .single();

    if (puzzleError) throw puzzleError;

    const { error: translationError } = await supabase.from("puzzle_translations").insert({
      puzzle_id: puzzle.id,
      locale,
      title: p.title,
      scenario: p.scenario,
      solution: p.solution,
      hint: p.hint ?? null,
      status: "reviewed",
    });

    if (translationError) throw translationError;

    existingKeys.add(`${locale}::${p.title}`);
    inserted += 1;
  }

  return inserted;
}

/**
 * Deletes every puzzle in a pack (cascades to puzzle_translations and
 * puzzle_votes). Fails with a foreign-key error if any of the pack's
 * puzzles is still referenced by an active room's questions/guesses/hints
 * — those rows only clear once the room itself is removed by the 24h
 * cleanup — which is the DB protecting live game state, not a bug to catch
 * and paper over here. Used to clear a pack before re-importing replacement
 * content, since insertPuzzles only ever adds, never replaces.
 */
export async function deletePackPuzzles(supabase: Client, packId: string): Promise<number> {
  const { data, error } = await supabase.from("puzzles").delete().eq("pack_id", packId).select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export type PuzzleTranslationInput = {
  /** The existing Dutch title to match against — identifies which puzzle this translation belongs to. */
  matchTitle: string;
  title: string;
  scenario: string;
  solution: string;
  hint?: string | null;
};

/**
 * Attaches a translation to *existing* puzzles in a pack, matched by their
 * Dutch title — unlike insertPuzzles, this never creates a new puzzle row,
 * it only adds a puzzle_translations row for the given locale on the
 * puzzle that already has a matching Dutch translation. Skips (and doesn't
 * count) any entry whose matchTitle isn't found, so a partially-translated
 * pack file doesn't fail the whole batch. Upserts rather than inserts, so
 * re-running the same file updates the translation instead of erroring.
 */
export async function translatePuzzles(
  supabase: Client,
  packId: string,
  locale: string,
  entries: PuzzleTranslationInput[]
): Promise<number> {
  if (entries.length === 0) return 0;

  const { data: puzzleIds, error: puzzleIdsError } = await supabase
    .from("puzzles")
    .select("id")
    .eq("pack_id", packId);

  if (puzzleIdsError) throw puzzleIdsError;
  if (!puzzleIds || puzzleIds.length === 0) return 0;

  const { data: dutchTranslations, error: dutchError } = await supabase
    .from("puzzle_translations")
    .select("puzzle_id, title")
    .eq("locale", "nl")
    .in(
      "puzzle_id",
      puzzleIds.map((p) => p.id)
    );

  if (dutchError) throw dutchError;

  const puzzleIdByDutchTitle = new Map<string, string>();
  for (const row of dutchTranslations ?? []) {
    puzzleIdByDutchTitle.set(row.title, row.puzzle_id);
  }

  let translated = 0;
  for (const entry of entries) {
    const puzzleId = puzzleIdByDutchTitle.get(entry.matchTitle);
    if (!puzzleId) continue;

    const { error } = await supabase.from("puzzle_translations").upsert(
      {
        puzzle_id: puzzleId,
        locale,
        title: entry.title,
        scenario: entry.scenario,
        solution: entry.solution,
        hint: entry.hint ?? null,
        status: "machine",
      },
      { onConflict: "puzzle_id,locale" }
    );

    if (error) throw error;
    translated += 1;
  }

  return translated;
}
