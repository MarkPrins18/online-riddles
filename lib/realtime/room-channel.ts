import type { SupabaseClient, RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player, PlayerPresence } from "@/types/player";
import type { Room } from "@/types/room";
import type { Question } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { ChatMessage } from "@/types/chatMessage";
import type { ChatMessageReaction } from "@/types/chatMessageReaction";
import type { CaseLogEntry } from "@/types/caseLog";
import type { RoundSecret } from "@/types/roundSecret";
import type { RoundAccusation } from "@/types/roundAccusation";

type Client = SupabaseClient<Database>;

export type RoomChannelHandlers = {
  onRoomUpdate?: (room: Room) => void;
  onPlayerJoin?: (player: Player) => void;
  onPlayerLeave?: (playerId: string) => void;
  onPlayerUpdate?: (player: Player) => void;
  onQuestionInsert?: (question: Question) => void;
  onQuestionUpdate?: (question: Question) => void;
  onGuessInsert?: (guess: Guess) => void;
  onGuessUpdate?: (guess: Guess) => void;
  onChatMessageInsert?: (message: ChatMessage) => void;
  onChatReactionInsert?: (reaction: ChatMessageReaction) => void;
  onChatReactionDelete?: (reactionId: string) => void;
  onCaseLogInsert?: (entry: CaseLogEntry) => void;
  onRoundSecretInsert?: (secret: RoundSecret) => void;
  /**
   * Fires on the `revealed: true` flip (see close_accusation_vote) — the
   * caller should treat this as a signal to refetch round_accusations too,
   * since RLS-newly-visible rows never get pushed retroactively by
   * Realtime, only rows inserted/updated after the subscription noticed
   * the change.
   */
  onRoundSecretUpdate?: (secret: RoundSecret) => void;
  onRoundAccusationInsert?: (accusation: RoundAccusation) => void;
  onRoundAccusationUpdate?: (accusation: RoundAccusation) => void;
  onPresenceSync?: (players: PlayerPresence[]) => void;
  /**
   * Postgres Changes only pushes events while the socket is actually open —
   * a silently dropped connection (backgrounded mobile tab, laptop sleep, a
   * brief network blip) doesn't replay whatever was missed once it
   * reconnects. Without watching subscribe status, nothing in the app ever
   * finds out a gap happened, so a caller uses this to detect "SUBSCRIBED
   * again after having connected before" and resync affected data.
   */
  onStatusChange?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void;
};

export function subscribeToRoom(
  supabase: Client,
  roomId: string,
  handlers: RoomChannelHandlers
): RealtimeChannel {
  const channel = supabase.channel(`room:${roomId}`, {
    config: { presence: { key: roomId } },
  });

  channel
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      (payload) => handlers.onRoomUpdate?.(payload.new as Room)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onPlayerJoin?.(payload.new as Player)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onPlayerUpdate?.(payload.new as Player)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onPlayerLeave?.((payload.old as Player).id)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "questions", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onQuestionInsert?.(payload.new as Question)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "questions", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onQuestionUpdate?.(payload.new as Question)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "guesses", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onGuessInsert?.(payload.new as Guess)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "guesses", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onGuessUpdate?.(payload.new as Guess)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onChatMessageInsert?.(payload.new as ChatMessage)
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_message_reactions",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onChatReactionInsert?.(payload.new as ChatMessageReaction)
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "chat_message_reactions",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onChatReactionDelete?.((payload.old as ChatMessageReaction).id)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "case_log", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onCaseLogInsert?.(payload.new as CaseLogEntry)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "round_secrets", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onRoundSecretInsert?.(payload.new as RoundSecret)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "round_secrets", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onRoundSecretUpdate?.(payload.new as RoundSecret)
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "round_accusations",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onRoundAccusationInsert?.(payload.new as RoundAccusation)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "round_accusations",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onRoundAccusationUpdate?.(payload.new as RoundAccusation)
    )
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PlayerPresence>();
      const players = Object.values(state).flat();
      handlers.onPresenceSync?.(players);
    });

  channel.subscribe((status, err) => handlers.onStatusChange?.(status, err));

  return channel;
}

export async function trackPresence(
  channel: RealtimeChannel,
  presence: PlayerPresence
): Promise<void> {
  await channel.track(presence);
}

export function unsubscribeFromRoom(channel: RealtimeChannel): void {
  channel.unsubscribe();
}
