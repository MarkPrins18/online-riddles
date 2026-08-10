"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactionSummary } from "@/lib/game/chatReactions";

/** Already-placed reactions on a message, shown as tappable pills — tap your own again to remove it. */
export function ChatReactionPills({
  summaries,
  onToggle,
}: {
  summaries: ReactionSummary[];
  onToggle: (emoji: string) => Promise<void>;
}) {
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  const t = useTranslations("ChatMessageReactions");

  async function handleClick(emoji: string) {
    if (pendingEmoji) return;
    setPendingEmoji(emoji);
    try {
      await onToggle(emoji);
    } catch {
      // Best-effort — a failed reaction toggle just leaves the pill as it was.
    }
    setPendingEmoji(null);
  }

  return (
    <div className="flex flex-wrap gap-1" aria-live="off">
      {summaries.map(({ emoji, count, reactedByMe }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleClick(emoji)}
          disabled={pendingEmoji !== null}
          aria-pressed={reactedByMe}
          aria-label={reactedByMe ? t("removeLabel", { emoji }) : t("addLabel", { emoji })}
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs leading-none transition-colors disabled:cursor-not-allowed ${
            reactedByMe
              ? "border-accent bg-accent/15 text-accent"
              : "border-white/15 text-text-secondary hover:border-accent-muted"
          }`}
        >
          <span aria-hidden="true">{emoji}</span>
          <span className="font-mono text-[10px]">{count}</span>
        </button>
      ))}
    </div>
  );
}
