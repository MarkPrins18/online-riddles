import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Category } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

type CategoryTranslationRow = {
  category_id: string;
  locale: string;
  name: string;
};

/**
 * Every category, resolved for `locale` (falling back to Dutch wherever the
 * requested locale has no translation yet), for a picker (community
 * submission form, admin import).
 */
export async function listCategories(supabase: Client, locale: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("category_translations")
    .select("category_id, locale, name")
    .in("locale", locale === "nl" ? ["nl"] : [locale, "nl"]);

  if (error) throw error;

  const byCategory = new Map<string, CategoryTranslationRow>();
  for (const row of (data ?? []) as CategoryTranslationRow[]) {
    const existing = byCategory.get(row.category_id);
    // Prefer the requested locale over the Dutch fallback if both exist.
    if (!existing || row.locale === locale) byCategory.set(row.category_id, row);
  }

  return [...byCategory.values()]
    .map((row) => ({ id: row.category_id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolves a category name (in the given locale) to its id, creating the
 * category — and its translation row — if it doesn't exist yet. Only
 * reachable with the service-role key (import script/admin API) — RLS
 * blocks anyone else from writing to `categories`, so community submissions
 * can only ever pick an existing id via listCategories.
 */
export async function resolveCategoryId(
  supabase: Client,
  name: string,
  locale: string = "nl"
): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("category_translations")
    .select("category_id")
    .eq("locale", locale)
    .ilike("name", name)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing.category_id;

  const { data: category, error: insertError } = await supabase
    .from("categories")
    .insert({})
    .select("id")
    .single();

  if (insertError) throw insertError;

  const { error: translationError } = await supabase
    .from("category_translations")
    .insert({ category_id: category.id, locale, name, status: "reviewed" });

  if (translationError) throw translationError;

  return category.id;
}
