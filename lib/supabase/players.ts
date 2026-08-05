import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Player } from "@/types/player";

type Client = SupabaseClient<Database>;

export async function joinRoom(
  supabase: Client,
  roomId: string,
  name: string,
  isHost: boolean,
  userId: string,
  id?: string
): Promise<Player> {
  const { data, error } = await supabase
    .from("players")
    .insert({
      ...(id ? { id } : {}),
      room_id: roomId,
      user_id: userId,
      name,
      is_host: isHost,
      is_narrator: false,
      score: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

export async function getPlayersInRoom(
  supabase: Client,
  roomId: string
): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Player[];
}

/** Host-only (enforced server-side) — assigns the Verteller and updates rooms.narrator_id atomically. */
export async function setNarrator(
  supabase: Client,
  roomId: string,
  narratorId: string
): Promise<void> {
  const { error } = await supabase.rpc("set_narrator", {
    room_id_input: roomId,
    player_id_input: narratorId,
  });

  if (error) throw error;
}

/** Narrator- or host-only (enforced server-side). */
export async function incrementScore(
  supabase: Client,
  playerId: string,
  amount: number,
  roomId: string
): Promise<void> {
  const { error } = await supabase.rpc("increment_player_score", {
    player_id_input: playerId,
    amount_input: amount,
    room_id_input: roomId,
  });

  if (error) throw error;
}

/** Current-host-only (enforced server-side) — transfers the role and updates rooms.host_id atomically. */
export async function setHost(
  supabase: Client,
  roomId: string,
  newHostId: string
): Promise<void> {
  const { error } = await supabase.rpc("set_host", {
    room_id_input: roomId,
    player_id_input: newHostId,
  });

  if (error) throw error;
}

/**
 * Self-claim only, for when the current host has disconnected (no client
 * can authenticate as them to call setHost). Enforced server-side (see
 * claim_host in schema.sql): any room member may claim host for
 * themselves — the caller decides when this is appropriate (see
 * lib/game/membership.ts: pickNextHost), not the database.
 */
export async function claimHost(
  supabase: Client,
  roomId: string,
  claimingPlayerId: string
): Promise<void> {
  const { error } = await supabase.rpc("claim_host", {
    room_id_input: roomId,
    claiming_player_id: claimingPlayerId,
  });

  if (error) throw error;
}

export async function leaveRoom(
  supabase: Client,
  playerId: string
): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
}
