import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getRoomByCode } from "@/lib/supabase/rooms";
import { joinRoom } from "@/lib/supabase/players";
import type { Room } from "@/types/room";

export type JoinByCodeResult =
  | { status: "joined"; room: Room; playerId: string }
  | { status: "notFound" }
  | { status: "full" };

/**
 * Shared by every "join with a room code" form (the homepage hero form and
 * the room page's JoinRoomForm), so the two can't drift apart. Expected
 * outcomes come back as a status; anything else is thrown for the caller
 * to show as a generic error.
 */
export async function joinRoomByCode(name: string, code: string): Promise<JoinByCodeResult> {
  const supabase = createClient();
  const userId = await ensureAnonymousSession(supabase);
  const room = await getRoomByCode(supabase, code);
  if (!room) return { status: "notFound" };

  try {
    const player = await joinRoom(supabase, room.id, name, false, userId);
    return { status: "joined", room, playerId: player.id };
  } catch (err) {
    // RM001: the room's player cap was hit (raised by the join trigger).
    if ((err as { code?: string } | null)?.code === "RM001") return { status: "full" };
    throw err;
  }
}
