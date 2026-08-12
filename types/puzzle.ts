export type PuzzleDifficulty = "easy" | "medium" | "hard";

export type Category = {
  id: string;
  name: string;
};

export type Puzzle = {
  id: string;
  pack_id: string;
  title: string;
  scenario: string;
  solution: string;
  /** Category name, resolved from category_id — see get_published_puzzles/get_room_puzzle in schema.sql. */
  category: string | null;
  category_id: string | null;
  difficulty: PuzzleDifficulty;
  hint: string | null;
  created_at: string;
  created_by: string | null;
  is_community: boolean;
  /**
   * Which language the title/scenario/solution/hint above actually came
   * from — may differ from the locale that was requested, when the
   * requested one has no translation yet and the query fell back to Dutch.
   * Not present on rows read directly from the `puzzles` table (which no
   * longer carries text at all) — only on results from
   * get_published_puzzles/get_room_puzzle, or attached manually where a
   * specific translation row was fetched (see lib/supabase/communityPuzzles.ts).
   */
  locale: string;
};

/** Row shape of the published_puzzles view — same as Puzzle, plus the pack's theme for filtering. */
export type PublishedPuzzle = Puzzle & { theme: string };

/**
 * Row shape of get_published_puzzle_candidates — just enough to run
 * getRandomPuzzle's filter cascade (theme, difficulty, pack membership)
 * without paying for every published puzzle's full text up front. See
 * get_published_puzzle for the follow-up fetch of the winning id's actual
 * content.
 */
export type PuzzleCandidate = {
  id: string;
  pack_id: string;
  theme: string;
  difficulty: PuzzleDifficulty;
  is_community: boolean;
};

/**
 * Puzzle without its solution — for anything rendered to players who
 * haven't solved it yet (community browse pages). `solution` must never be
 * selected for these views: RLS lets anyone read it, so leaving it out is
 * on the query, not on what the UI chooses to render.
 */
export type PuzzlePreview = Omit<Puzzle, "solution">;

export type StoryPack = {
  id: string;
  slug: string;
  name: string;
  theme: string;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
  is_community: boolean;
  /** Which language `name` actually came from — see Puzzle["locale"] for the same idea. */
  locale: string;
};

export type TranslationStatus = "machine" | "reviewed";

/** Raw row shape of `puzzle_translations` — one language's text for one puzzle. */
export type PuzzleTranslation = {
  puzzle_id: string;
  locale: string;
  title: string;
  scenario: string;
  solution: string;
  hint: string | null;
  status: TranslationStatus;
  created_at: string;
};

/** Raw row shape of `category_translations` — one language's name for one category. */
export type CategoryTranslation = {
  category_id: string;
  locale: string;
  name: string;
  status: TranslationStatus;
  created_at: string;
};

/** Raw row shape of `story_pack_translations` — one language's name for one pack. */
export type StoryPackTranslation = {
  pack_id: string;
  locale: string;
  name: string;
  status: TranslationStatus;
  created_at: string;
};
