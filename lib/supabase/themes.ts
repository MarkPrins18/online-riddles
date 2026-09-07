import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Theme } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

type ThemeTranslationRow = {
  theme_id: string;
  locale: string;
  name: string;
};

/**
 * Every curated theme, resolved for `locale` (falling back to Dutch wherever
 * the requested locale has no translation yet) — the full catalog for the
 * pack-creation picker. Same shape/pattern as lib/supabase/categories.ts's
 * listCategories; themes used to be free text a creator could type (see
 * schema.sql history), which mixed languages and let "test"-style junk pile
 * up, so they're curated the same way categories already were.
 */
export async function listThemes(supabase: Client, locale: string): Promise<Theme[]> {
  const { data, error } = await supabase
    .from("theme_translations")
    .select("theme_id, locale, name")
    .in("locale", locale === "nl" ? ["nl"] : [locale, "nl"]);

  if (error) throw error;

  const byTheme = new Map<string, ThemeTranslationRow>();
  for (const row of (data ?? []) as ThemeTranslationRow[]) {
    const existing = byTheme.get(row.theme_id);
    // Prefer the requested locale over the Dutch fallback if both exist.
    if (!existing || row.locale === locale) byTheme.set(row.theme_id, row);
  }

  return [...byTheme.values()]
    .map((row) => ({ id: row.theme_id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Distinct themes actually used by published *official* packs, resolved for
 * `locale` — the room-settings form's "Thema's" filter, kept separate from
 * the full curated catalog (which may include themes with no official pack
 * yet) and from community packs (its own, unfiltered "Community" toggle).
 */
export async function listOfficialThemeOptions(supabase: Client, locale: string): Promise<Theme[]> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("theme_id")
    .eq("is_published", true)
    .eq("is_community", false);

  if (error) throw error;

  const usedIds = new Set((data ?? []).map((row) => row.theme_id));
  if (usedIds.size === 0) return [];

  const all = await listThemes(supabase, locale);
  return all.filter((theme) => usedIds.has(theme.id));
}

/**
 * Resolves a theme name (in the given locale) to its id, creating the
 * theme — and its translation row — if it doesn't exist yet. Only reachable
 * with the service-role key (import script/admin API) — RLS blocks anyone
 * else from writing to `themes`, so PackForm can only ever pick an existing
 * id via listThemes. Mirrors resolveCategoryId in lib/supabase/categories.ts.
 */
export async function resolveThemeId(supabase: Client, name: string, locale: string = "nl"): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("theme_translations")
    .select("theme_id")
    .eq("locale", locale)
    .ilike("name", name)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing.theme_id;

  const { data: theme, error: insertError } = await supabase.from("themes").insert({}).select("id").single();

  if (insertError) throw insertError;

  const { error: translationError } = await supabase
    .from("theme_translations")
    .insert({ theme_id: theme.id, locale, name, status: "reviewed" });

  if (translationError) throw translationError;

  return theme.id;
}
