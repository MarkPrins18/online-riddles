import type { ChatMessageReaction } from "@/types/chatMessageReaction";

export type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

/** Groups one message's reactions into a summary per emoji, ordered by first use. */
export function summarizeReactions(
  reactions: ChatMessageReaction[],
  messageId: string,
  playerId: string
): ReactionSummary[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  const mine = new Set<string>();

  for (const reaction of reactions) {
    if (reaction.message_id !== messageId) continue;
    if (!counts.has(reaction.emoji)) {
      counts.set(reaction.emoji, 0);
      order.push(reaction.emoji);
    }
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
    if (reaction.player_id === playerId) mine.add(reaction.emoji);
  }

  return order.map((emoji) => ({
    emoji,
    count: counts.get(emoji) ?? 0,
    reactedByMe: mine.has(emoji),
  }));
}
