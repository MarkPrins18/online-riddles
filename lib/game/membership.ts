import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { leaveRoom, setHost } from "@/lib/supabase/players";

/**
 * Removes a player from the room. If they were the host, hands the role to
 * the next-earliest joiner first — otherwise the room would be stranded
 * with a `host_id` pointing at nobody, and nobody left could start rounds,
 * change settings, or use the Verteller-takeover tool.
 */
export async function handlePlayerLeave(
  supabase: SupabaseClient<Database>,
  roomId: string,
  players: Player[],
  leavingPlayerId: string
): Promise<void> {
  const leavingPlayer = players.find((p) => p.id === leavingPlayerId);
  const remaining = players.filter((p) => p.id !== leavingPlayerId);

  if (leavingPlayer?.is_host && remaining.length > 0) {
    const ordered = [...remaining].sort(
      (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    );
    const newHost = ordered[0];
    await setHost(supabase, roomId, newHost.id);
  }

  await leaveRoom(supabase, leavingPlayerId);
}

/**
 * Host-only kick handler with a native confirm guard — removing someone is
 * a one-click destructive action otherwise, easy to fat-finger on a
 * fast-moving scoreboard.
 */
export function createKickHandler(
  supabase: SupabaseClient<Database>,
  players: Player[]
): (targetId: string) => void {
  return (targetId: string) => {
    const target = players.find((p) => p.id === targetId);
    const label = target ? target.name : "deze speler";
    if (!window.confirm(`${label} uit de kamer verwijderen?`)) return;
    leaveRoom(supabase, targetId);
  };
}
