"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendHint } from "@/lib/supabase/hints";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

/**
 * Entirely the Verteller's own initiative — no default text, no timer, no
 * suggestion of what to write. They may send as many or as few as they
 * like, whenever they like.
 */
export function NarratorHintForm({
  supabase,
  roomId,
  puzzleId,
  round,
  playerId,
  playerName,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  puzzleId: string;
  round: number;
  playerId: string;
  playerName: string;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("NarratorHintForm");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await sendHint(supabase, {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        rows={2}
        maxLength={300}
        className="w-full resize-none rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
      />
      {error && (
        <p role="alert" className="font-mono text-xs text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" className="w-full" disabled={isSubmitting || !text.trim()}>
        {t("submit")}
      </Button>
    </form>
  );
}
