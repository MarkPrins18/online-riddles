"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/types/chatMessage";
import type { ReactionSummary } from "@/lib/game/chatReactions";
import { usePressHold } from "@/lib/ui/usePressHold";
import { Badge } from "@/components/ui/Badge";
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
  narratorId,
  summaries,
  onToggleReaction,
}: {
  message: ChatMessage;
  narratorId: string | null;
  summaries: ReactionSummary[];
  onToggleReaction: (emoji: string) => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = useTranslations("ChatThread");
  const reactionsT = useTranslations("ChatMessageReactions");
  const pressHold = usePressHold(() => setPickerOpen(true));

  function handlePick(emoji: string) {
    onToggleReaction(emoji);
    setPickerOpen(false);
  }

  return (
    <li className="group relative flex flex-col gap-0.5">
      <div {...pressHold} className="flex select-none items-baseline gap-2">
        <span className="font-mono text-xs text-text-secondary">
          {message.player_name}
          {message.player_id === narratorId && (
            <Badge tone="accent" className="ml-1 align-middle">
              {t("narratorBadge")}
            </Badge>
          )}
          :
        </span>
        <span className="font-mono text-sm text-text-primary">{message.text}</span>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          aria-label={reactionsT("openPicker")}
          className="shrink-0 rounded-full px-1 text-xs leading-none text-text-secondary opacity-0 transition-opacity group-hover:opacity-60 focus:opacity-100 hover:!opacity-100"
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
