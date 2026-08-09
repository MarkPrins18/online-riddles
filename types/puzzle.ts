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
  /** Category name, resolved from category_id — see published_puzzles/get_room_puzzle in schema.sql. */
  category: string | null;
  category_id: string | null;
  difficulty: PuzzleDifficulty;
  hint: string | null;
  created_at: string;
  created_by: string | null;
  is_community: boolean;
};

/** Row shape of the published_puzzles view — same as Puzzle, plus the pack's theme for filtering. */
export type PublishedPuzzle = Puzzle & { theme: string };

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
};
