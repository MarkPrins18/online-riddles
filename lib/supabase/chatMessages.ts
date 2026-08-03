import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { ChatMessage } from "@/types/chatMessage";

type Client = SupabaseClient<Database>;

/** Room-wide, not scoped to a puzzle/round — casual overleg between players. */
export async function sendChatMessage(
  supabase: Client,
  params: {
    roomId: string;
    playerId: string;
    playerName: string;
    text: string;
  }
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: params.roomId,
      player_id: params.playerId,
      player_name: params.playerName,
      text: params.text,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessage;
}

export async function getChatMessages(
  supabase: Client,
  roomId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}
