"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("ChatForm");

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
      setError(getErrorMessage(err, t("error")));
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        maxLength={300}
        className="w-full rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-accent"
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" className="w-full" disabled={isSubmitting || !text.trim()}>
        {t("submit")}
      </Button>
    </form>
  );
}
