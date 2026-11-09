"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { askQuestion } from "@/lib/supabase/questions";
import { getErrorMessage } from "@/lib/errors";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function QuestionForm({
  supabase,
  roomId,
  puzzleId,
  playerId,
  playerName,
  round,
  variant = "stacked",
  trailing,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  puzzleId: string;
  playerId: string;
  playerName: string;
  round: number;
  /** "bar": one row — input, submit, then `trailing` — as on the game
   * screen's action bar. "stacked" (default): input above a full-width button. */
  variant?: "stacked" | "bar";
  trailing?: ReactNode;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("QuestionForm");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await askQuestion(supabase, {
        roomId,
        puzzleId,
        playerId,
        playerName,
        text: text.trim(),
        round,
      });
      setText("");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
    setIsSubmitting(false);
  }

  if (variant === "bar") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("ariaLabel")}
          maxLength={140}
          className="min-w-0 flex-[1_1_320px] rounded-[10px] border-[3px] border-text-primary bg-bg-secondary px-4 py-[15px] text-lg text-text-primary placeholder:text-text-secondary/70 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="cursor-pointer rounded-[10px] border-[3px] bg-text-primary border-text-primary px-6 py-[11px] font-display text-[22px] uppercase tracking-[0.03em] text-ink disabled:cursor-not-allowed"
        >
          {t("submit")}
        </button>
        {trailing}
        {error && (
          <p role="alert" className="basis-full text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        maxLength={140}
        className="w-full rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-accent"
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting || !text.trim()}>
        {t("submit")}
      </Button>
    </form>
  );
}
