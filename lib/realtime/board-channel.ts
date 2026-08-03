import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BoardItem } from "@/types/boardItem";
import type { BoardConnection } from "@/types/boardConnection";
import type { BoardCursor } from "@/types/boardCursor";

type Client = SupabaseClient<Database>;

export type BoardChannelHandlers = {
  onItemInsert?: (item: BoardItem) => void;
  onItemUpdate?: (item: BoardItem) => void;
  onItemDelete?: (itemId: string) => void;
  onConnectionInsert?: (connection: BoardConnection) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onCursor?: (cursor: BoardCursor) => void;
};

/**
 * A second, opt-in channel separate from room-channel.ts's always-on
 * `room:${roomId}` channel — only created while the corkboard overlay is
 * mounted, so players who never open the board never subscribe to it.
 */
export function subscribeToBoard(
  supabase: Client,
  roomId: string,
  handlers: BoardChannelHandlers
): RealtimeChannel {
  const channel = supabase.channel(`room:${roomId}:board`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "board_items", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onItemInsert?.(payload.new as BoardItem)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "board_items", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onItemUpdate?.(payload.new as BoardItem)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "board_items", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onItemDelete?.((payload.old as BoardItem).id)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "board_connections", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onConnectionInsert?.(payload.new as BoardConnection)
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "board_connections", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onConnectionDelete?.((payload.old as BoardConnection).id)
    )
    .on("broadcast", { event: "cursor" }, ({ payload }) => {
      handlers.onCursor?.(payload as BoardCursor);
    });

  channel.subscribe();

  return channel;
}

export async function sendCursor(channel: RealtimeChannel, cursor: BoardCursor): Promise<void> {
  await channel.send({ type: "broadcast", event: "cursor", payload: cursor });
}

export function unsubscribeFromBoard(channel: RealtimeChannel): void {
  channel.unsubscribe();
}
