"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createCommunityPuzzle, updateOwnPuzzle } from "@/lib/supabase/communityPuzzles";
import { getErrorMessage } from "@/lib/errors";
import type { Puzzle } from "@/types/puzzle";
import { Button } from "@/components/ui/Button";

const inputClasses =
  "rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted";
const textareaClasses = `${inputClasses} min-h-24 resize-y`;
const labelClasses = "font-mono text-xs uppercase tracking-widest text-text-secondary";

const DIFFICULTY_OPTIONS: Array<{ value: Puzzle["difficulty"]; label: string }> = [
  { value: "easy", label: "Makkelijk" },
  { value: "medium", label: "Gemiddeld" },
  { value: "hard", label: "Moeilijk" },
];

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
  const [category, setCategory] = useState(puzzle?.category ?? "");
  const [difficulty, setDifficulty] = useState<Puzzle["difficulty"]>(puzzle?.difficulty ?? "medium");
  const [hint, setHint] = useState(puzzle?.hint ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim() && scenario.trim() && solution.trim();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const input = {
        packId,
        title: title.trim(),
        scenario: scenario.trim(),
        solution: solution.trim(),
        category: category.trim() || null,
        difficulty,
        hint: hint.trim() || null,
      };

      if (isEditing) {
        const updated = await updateOwnPuzzle(supabase, puzzle.id, input);
        onSaved(updated);
      } else {
        const userId = await ensureAnonymousSession(supabase);
        const created = await createCommunityPuzzle(supabase, userId, input);
        setTitle("");
        setScenario("");
        setSolution("");
        setCategory("");
        setHint("");
        onSaved(created);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Kon het raadsel niet opslaan. Probeer het opnieuw."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="riddle-title" className={labelClasses}>
        Titel
      </label>
      <input
        id="riddle-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="De verdwenen..."
        maxLength={80}
        className={inputClasses}
      />

      <label htmlFor="riddle-scenario" className={labelClasses}>
        Scenario — wat de spelers te zien krijgen
      </label>
      <textarea
        id="riddle-scenario"
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
        placeholder="Beschrijf de situatie..."
        className={textareaClasses}
      />

      <label htmlFor="riddle-solution" className={labelClasses}>
        Oplossing — alleen zichtbaar voor de Verteller
      </label>
      <textarea
        id="riddle-solution"
        value={solution}
        onChange={(e) => setSolution(e.target.value)}
        placeholder="Wat er werkelijk is gebeurd..."
        className={textareaClasses}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="riddle-category" className={labelClasses}>
            Categorie (optioneel)
          </label>
          <input
            id="riddle-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Moordwapen, fraude..."
            maxLength={40}
            className={`${inputClasses} mt-1 w-full`}
          />
        </div>
        <div className="w-40">
          <label htmlFor="riddle-difficulty" className={labelClasses}>
            Moeilijkheid
          </label>
          <select
            id="riddle-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Puzzle["difficulty"])}
            className={`${inputClasses} mt-1 w-full`}
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="riddle-hint" className={labelClasses}>
        Hint (optioneel)
      </label>
      <input
        id="riddle-hint"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="Een klein duwtje in de goede richting..."
        maxLength={120}
        className={inputClasses}
      />

      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting
            ? "Opslaan..."
            : isEditing
              ? "Wijzigingen opslaan"
              : "Raadsel toevoegen"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuleren
          </Button>
        )}
      </div>
    </form>
  );
}
