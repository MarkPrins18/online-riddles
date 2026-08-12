import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getPackBySlug } from "@/lib/supabase/storyPacks";
import { deletePackPuzzles } from "@/lib/supabase/puzzles";

export type DeletePuzzlePackResult = {
  packSlug: string;
  deleted: number;
};

/**
 * Deletes every puzzle in a pack, by slug, so the pack's JSON file can be
 * re-imported with replacement content afterwards. Leaves the pack row
 * itself (name/theme/publish state) untouched.
 */
export async function deletePuzzlePack(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<DeletePuzzlePackResult> {
  const pack = await getPackBySlug(supabase, slug, "nl");
  if (!pack) {
    throw new Error(`Geen pack gevonden met slug "${slug}".`);
  }

  const deleted = await deletePackPuzzles(supabase, pack.id);
  return { packSlug: pack.slug, deleted };
}
