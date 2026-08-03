import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player, PlayerPresence } from "@/types/player";
import type { Room } from "@/types/room";
import type { Question } from "@/types/question";
import type { Guess } from "@/types/guess";
import type { ChatMessage } from "@/types/chatMessage";
import type { CaseLogEntry } from "@/types/caseLog";

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
  onCaseLogInsert?: (entry: CaseLogEntry) => void;
  onPresenceSync?: (players: PlayerPresence[]) => void;
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
      { event: "INSERT", schema: "public", table: "case_log", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onCaseLogInsert?.(payload.new as CaseLogEntry)
    )
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PlayerPresence>();
      const players = Object.values(state).flat();
      handlers.onPresenceSync?.(players);
    });

  channel.subscribe();

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
