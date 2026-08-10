import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/types/chatMessage";
import type { ChatMessageReaction } from "@/types/chatMessageReaction";
import { summarizeReactions } from "@/lib/game/chatReactions";
import { ChatMessageRow } from "./ChatMessageRow";

export function ChatThread({
  messages,
  narratorId,
  chatReactions,
  playerId,
  onToggleReaction,
}: {
  messages: ChatMessage[];
  narratorId: string | null;
  chatReactions: ChatMessageReaction[];
  playerId: string;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
}) {
  const t = useTranslations("ChatThread");

  if (messages.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" role="log" aria-live="polite">
      {messages.map((message) => (
        <ChatMessageRow
          key={message.id}
          message={message}
          narratorId={narratorId}
          summaries={summarizeReactions(chatReactions, message.id, playerId)}
          onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
        />
      ))}
    </ul>
  );
}
