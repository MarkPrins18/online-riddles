"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/types/chatMessage";
import type { ReactionSummary } from "@/lib/game/chatReactions";
import { usePressHold } from "@/lib/ui/usePressHold";
import { ChatReactionPills } from "./ChatReactionPills";
import { ChatReactionPicker } from "./ChatReactionPicker";

/**
 * One chat message plus its reactions. Long-press (or tap/click-and-hold —
 * Pointer Events cover both) the message bubble to open the reaction
 * picker, mirroring the mobile "hold a message" gesture. A small button
 * revealed on hover/focus offers the same picker for keyboard and
 * assistive-tech users, since a press-and-hold gesture alone isn't
 * reachable that way.
 */
export function ChatMessageRow({
  message,
  isOwn = false,
  summaries,
  onToggleReaction,
}: {
  message: ChatMessage;
  /** Your own messages sit on the right in yellow, everyone else's on the
   * left in cream — like any messaging app, so you never read your own
   * line as someone else's. */
  isOwn?: boolean;
  summaries: ReactionSummary[];
  onToggleReaction: (emoji: string) => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactionsT = useTranslations("ChatMessageReactions");
  const pressHold = usePressHold(() => setPickerOpen(true));

  function handlePick(emoji: string) {
    onToggleReaction(emoji);
    setPickerOpen(false);
  }

  return (
    <li className={`group relative flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
      <div className={`flex max-w-full items-center gap-1 ${isOwn ? "flex-row-reverse" : ""}`}>
        <p
          {...pressHold}
          className={`min-w-0 select-none break-words px-3 py-2 text-[15px] text-ink ${
            isOwn
              ? "rounded-[16px_16px_4px_16px] bg-accent font-medium"
              : "rounded-[16px_16px_16px_4px] border-2 border-ink bg-paper"
          }`}
        >
          {isOwn ? (
            <span className="sr-only">{message.player_name}: </span>
          ) : (
            <b>{message.player_name} </b>
          )}
          {message.text}
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          aria-label={reactionsT("openPicker")}
          className="sr-only shrink-0 rounded-full px-1 text-xs leading-none text-text-secondary hover:text-text-primary focus:not-sr-only group-hover:not-sr-only"
        >
          ☺+
        </button>
      </div>

      {summaries.length > 0 && (
        <ChatReactionPills summaries={summaries} onToggle={onToggleReaction} />
      )}

      {pickerOpen && <ChatReactionPicker onPick={handlePick} onClose={() => setPickerOpen(false)} />}
    </li>
  );
}
