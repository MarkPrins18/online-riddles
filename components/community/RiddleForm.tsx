"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createCommunityPuzzle, updateOwnPuzzle } from "@/lib/supabase/communityPuzzles";
import { listCategories } from "@/lib/supabase/categories";
import { getErrorMessage } from "@/lib/errors";
import type { Category, Puzzle } from "@/types/puzzle";
import { Button } from "@/components/ui/Button";

const inputClasses =
  "rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted";
const textareaClasses = `${inputClasses} min-h-24 resize-y`;
const labelClasses = "font-mono text-xs uppercase tracking-widest text-text-secondary";

const DIFFICULTY_VALUES: Puzzle["difficulty"][] = ["easy", "medium", "hard"];

export function RiddleForm({
  packId,
  puzzle,
  onSaved,
  onCancel,
}: {
  packId: string;
  /** Pass an existing puzzle to edit it in place instead of creating a new one. */
  puzzle?: Puzzle;
  onSaved: (puzzle: Puzzle) => void;
  onCancel?: () => void;
}) {
  const isEditing = !!puzzle;
  const [title, setTitle] = useState(puzzle?.title ?? "");
  const [scenario, setScenario] = useState(puzzle?.scenario ?? "");
  const [solution, setSolution] = useState(puzzle?.solution ?? "");
  const [categoryId, setCategoryId] = useState(puzzle?.category_id ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulty, setDifficulty] = useState<Puzzle["difficulty"]>(puzzle?.difficulty ?? "medium");
  const [hint, setHint] = useState(puzzle?.hint ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("RiddleForm");
  const tDifficulty = useTranslations("Difficulty");
  const locale = useLocale();

  useEffect(() => {
    listCategories(createClient(), locale)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [locale]);

  const canSubmit = title.trim() && scenario.trim() && solution.trim();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const input = {
        title: title.trim(),
        scenario: scenario.trim(),
        solution: solution.trim(),
        categoryId: categoryId || null,
        difficulty,
        hint: hint.trim() || null,
      };

      if (isEditing) {
        const updated = await updateOwnPuzzle(supabase, puzzle.id, puzzle.locale, input);
        onSaved(updated);
      } else {
        const userId = await ensureAnonymousSession(supabase);
        const created = await createCommunityPuzzle(supabase, userId, { ...input, packId, locale });
        setTitle("");
        setScenario("");
        setSolution("");
        setCategoryId("");
        setHint("");
        onSaved(created);
      }
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="riddle-title" className={labelClasses}>
        {t("titleLabel")}
      </label>
      <input
        id="riddle-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("titlePlaceholder")}
        maxLength={80}
        className={inputClasses}
      />

      <label htmlFor="riddle-scenario" className={labelClasses}>
        {t("scenarioLabel")}
      </label>
      <textarea
        id="riddle-scenario"
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
        placeholder={t("scenarioPlaceholder")}
        className={textareaClasses}
      />

      <label htmlFor="riddle-solution" className={labelClasses}>
        {t("solutionLabel")}
      </label>
      <textarea
        id="riddle-solution"
        value={solution}
        onChange={(e) => setSolution(e.target.value)}
        placeholder={t("solutionPlaceholder")}
        className={textareaClasses}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="riddle-category" className={labelClasses}>
            {t("categoryLabel")}
          </label>
          <select
            id="riddle-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputClasses} mt-1 w-full`}
          >
            <option value="">{t("noCategoryOption")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="riddle-difficulty" className={labelClasses}>
            {t("difficultyLabel")}
          </label>
          <select
            id="riddle-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Puzzle["difficulty"])}
            className={`${inputClasses} mt-1 w-full`}
          >
            {DIFFICULTY_VALUES.map((value) => (
              <option key={value} value={value}>
                {tDifficulty(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="riddle-hint" className={labelClasses}>
        {t("hintLabel")}
      </label>
      <input
        id="riddle-hint"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder={t("hintPlaceholder")}
        maxLength={120}
        className={inputClasses}
      />

      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? t("saving") : isEditing ? t("saveChanges") : t("addRiddle")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
