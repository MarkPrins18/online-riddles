"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendChatMessage } from "@/lib/supabase/chatMessages";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

export function ChatForm({
  supabase,
  roomId,
  playerId,
  playerName,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  playerId: string;
  playerName: string;
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
      await sendChatMessage(supabase, {
        roomId,
        playerId,
        playerName,
        text: text.trim(),
      });
      setText("");
    } catch (err) {
      setError(getErrorMessage(err, "Kon je bericht niet versturen. Probeer het opnieuw."));
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Overleg met je medespelers..."
        aria-label="Chatbericht"
        maxLength={300}
        className="w-full rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
      />
      {error && (
        <p role="alert" className="font-mono text-xs text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" className="w-full" disabled={isSubmitting || !text.trim()}>
        Versturen
      </Button>
    </form>
  );
}
