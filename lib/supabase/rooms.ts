import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Room, RoomStatus, RoomSettingsInput } from "@/types/room";

type Client = SupabaseClient<Database>;

const ROOM_CODE_LENGTH = 6;

function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

const CODE_COLLISION_RETRIES = 5;

export async function createRoom(
  supabase: Client,
  hostId: string
): Promise<Room> {
  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt++) {
    const code = generateRoomCode();

    const { data, error } = await supabase
      .from("rooms")
      .insert({ code, host_id: hostId, status: "lobby", round: 0 })
      .select()
      .single();

    if (!error) return data as Room;
    if (error.code !== "23505") throw error; // not a unique-violation, bail out
  }

  throw new Error("Kon geen unieke roomcode genereren, probeer het opnieuw.");
}

export async function getRoomByCode(
  supabase: Client,
  code: string
): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data as Room | null;
}

export async function updateRoomStatus(
  supabase: Client,
  roomId: string,
  status: RoomStatus
): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({ status })
    .eq("id", roomId);

  if (error) throw error;
}

export async function setRoomPuzzle(
  supabase: Client,
  roomId: string,
  puzzleId: string,
  previouslyPlayedPuzzleIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({
      current_puzzle_id: puzzleId,
      status: "playing",
      round_started_at: new Date().toISOString(),
      played_puzzle_ids: [...previouslyPlayedPuzzleIds, puzzleId],
    })
    .eq("id", roomId);

  if (error) throw error;
}

export async function updateRoomSettings(
  supabase: Client,
  roomId: string,
  settings: RoomSettingsInput
): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({
      round_duration_seconds: settings.roundDurationSeconds,
      max_rounds: settings.maxRounds,
      pack_theme_filter: settings.packThemeFilter,
      community_pack_ids: settings.communityPackIds,
      hardcore_mode: settings.hardcoreMode,
      team_lives_total: settings.hardcoreMode ? settings.teamLives : null,
      team_lives_remaining: settings.hardcoreMode ? settings.teamLives : null,
    })
    .eq("id", roomId);

  if (error) throw error;
}

export async function decrementTeamLives(
  supabase: Client,
  roomId: string,
  currentLives: number
): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({ team_lives_remaining: Math.max(0, currentLives - 1) })
    .eq("id", roomId);

  if (error) throw error;
}

export async function advanceRoomRound(
  supabase: Client,
  roomId: string,
  round: number
): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({ round })
    .eq("id", roomId);

  if (error) throw error;
}
