import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { BoardItem, BoardNoteColor } from "@/types/boardItem";
import type { BoardConnection } from "@/types/boardConnection";

type Client = SupabaseClient<Database>;

export async function getBoardItems(supabase: Client, roomId: string): Promise<BoardItem[]> {
  const { data, error } = await supabase
    .from("board_items")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BoardItem[];
}

export async function getBoardConnections(
  supabase: Client,
  roomId: string
): Promise<BoardConnection[]> {
  const { data, error } = await supabase
    .from("board_connections")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BoardConnection[];
}

export async function addNote(
  supabase: Client,
  params: { roomId: string; playerId: string; text: string; color: BoardNoteColor; x: number; y: number }
): Promise<BoardItem> {
  const { data, error } = await supabase
    .from("board_items")
    .insert({
      room_id: params.roomId,
      kind: "note",
      text: params.text,
      color: params.color,
      question_id: null,
      x: params.x,
      y: params.y,
      created_by: params.playerId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BoardItem;
}

/** Throws a unique-violation if the question is already pinned in this room — caller should surface it via getErrorMessage. */
export async function pinQuestion(
  supabase: Client,
  params: { roomId: string; playerId: string; questionId: string; x: number; y: number }
): Promise<BoardItem> {
  const { data, error } = await supabase
    .from("board_items")
    .insert({
      room_id: params.roomId,
      kind: "question",
      text: null,
      question_id: params.questionId,
      x: params.x,
      y: params.y,
      created_by: params.playerId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BoardItem;
}

export async function moveBoardItem(
  supabase: Client,
  itemId: string,
  x: number,
  y: number
): Promise<BoardItem> {
  const { data, error } = await supabase
    .from("board_items")
    .update({ x, y })
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;
  return data as BoardItem;
}

/**
 * A DELETE blocked by RLS doesn't throw — Postgres just matches zero rows
 * and reports success. Selecting the deleted row back is how we detect
 * that and surface a real error instead of silently doing nothing.
 */
export async function deleteBoardItem(supabase: Client, itemId: string): Promise<void> {
  const { data, error } = await supabase.from("board_items").delete().eq("id", itemId).select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Je mag dit alleen verwijderen als je het zelf hebt geplakt, of als je de host bent.");
  }
}

export async function addConnection(
  supabase: Client,
  params: { roomId: string; playerId: string; fromItemId: string; toItemId: string }
): Promise<BoardConnection> {
  const { data, error } = await supabase
    .from("board_connections")
    .insert({
      room_id: params.roomId,
      from_item_id: params.fromItemId,
      to_item_id: params.toItemId,
      created_by: params.playerId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BoardConnection;
}

export async function deleteConnection(supabase: Client, connectionId: string): Promise<void> {
  const { data, error } = await supabase
    .from("board_connections")
    .delete()
    .eq("id", connectionId)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Je mag dit alleen verwijderen als je het zelf hebt getrokken, of als je de host bent.");
  }
}
