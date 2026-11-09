"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendChatMessage } from "@/lib/supabase/chatMessages";
import { getErrorMessage } from "@/lib/errors";

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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        maxLength={300}
        className="min-w-0 flex-1 rounded-lg border-2 border-[#5a5a5a] bg-bg-primary px-3 py-2.5 text-[15px] text-text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none"
      />
      {error && (
        <p role="alert" className="order-last basis-full text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        aria-label={t("submit")}
        disabled={isSubmitting || !text.trim()}
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
