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

  if (leavingPlayer?.is_host) {
    const ordered = remaining
      .filter((p) => !p.is_spectator)
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
    const newHost = ordered[0];
    if (newHost) await setHost(supabase, roomId, newHost.id);
  }

  await leaveRoom(supabase, leavingPlayerId);
}

/**
 * Who should claim host when the current one appears offline (see
 * ClaimHostBanner) — same "earliest joiner wins" rule as the explicit-leave
 * path above, but restricted to players Presence currently reports as
 * connected, since offering the role to another absent player wouldn't fix
 * anything. Returns null if nobody currently online qualifies (including
 * when the current host is themselves still online, or there's nobody else).
 */
export function pickNextHost(
  players: Player[],
  onlinePlayerIds: Set<string>,
  currentHostId: string
): Player | null {
  if (onlinePlayerIds.has(currentHostId)) return null;

  const candidates = players
    .filter((p) => p.id !== currentHostId && !p.is_spectator && onlinePlayerIds.has(p.id))
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  return candidates[0] ?? null;
}

/**
 * Which single online player should carry out the automatic Verteller
 * takeover once the current one has been offline past the timeout — same
 * "earliest joiner wins" rule as pickNextHost, reused here purely so that
 * when several clients independently notice the timeout, only one of them
 * actually calls the claim RPC instead of racing each other. Returns null if
 * the narrator is null, still online, or there's no online candidate to act.
 */
export function pickNarratorTakeoverElector(
  players: Player[],
  onlinePlayerIds: Set<string>,
  narratorId: string | null
): Player | null {
  if (!narratorId || onlinePlayerIds.has(narratorId)) return null;

  const candidates = players
    .filter((p) => p.id !== narratorId && !p.is_spectator && onlinePlayerIds.has(p.id))
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  return candidates[0] ?? null;
}

/**
 * Who the elected player (see pickNarratorTakeoverElector) actually hands the
 * Verteller role to — deliberately random rather than deterministic, so it
 * isn't presented to anyone as a choice: nobody picks who takes over, the
 * game just assigns it. `randomFn` is injectable so tests can pin the pick.
 */
export function pickRandomOnlineCandidate(
  players: Player[],
  onlinePlayerIds: Set<string>,
  excludeId: string | null,
  randomFn: () => number = Math.random
): Player | null {
  const candidates = players.filter(
    (p) => p.id !== excludeId && !p.is_spectator && onlinePlayerIds.has(p.id)
  );
  if (candidates.length === 0) return null;

  return candidates[Math.floor(randomFn() * candidates.length)];
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
