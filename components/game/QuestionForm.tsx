"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { askQuestion } from "@/lib/supabase/questions";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

export function QuestionForm({
  supabase,
  roomId,
  puzzleId,
  playerId,
  playerName,
  round,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  puzzleId: string;
  playerId: string;
  playerName: string;
  round: number;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(getErrorMessage(err, "Kon je vraag niet versturen. Probeer het opnieuw."));
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Stel een ja/nee-vraag..."
        maxLength={140}
        className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
      />
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting || !text.trim()}>
        Vragen
      </Button>
    </form>
  );
}
