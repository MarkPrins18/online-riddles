import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { ChatMessageReaction } from "@/types/chatMessageReaction";

type Client = SupabaseClient<Database>;

export async function getChatMessageReactions(
  supabase: Client,
  roomId: string
): Promise<ChatMessageReaction[]> {
  const { data, error } = await supabase
    .from("chat_message_reactions")
    .select("*")
    .eq("room_id", roomId);

  if (error) throw error;
  return (data ?? []) as ChatMessageReaction[];
}

export async function addChatMessageReaction(
  supabase: Client,
  params: {
    roomId: string;
    messageId: string;
    playerId: string;
    emoji: string;
  }
): Promise<ChatMessageReaction> {
  const { data, error } = await supabase
    .from("chat_message_reactions")
    .insert({
      room_id: params.roomId,
      message_id: params.messageId,
      player_id: params.playerId,
      emoji: params.emoji,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessageReaction;
}

export async function removeChatMessageReaction(
  supabase: Client,
  params: {
    messageId: string;
    playerId: string;
    emoji: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from("chat_message_reactions")
    .delete()
    .eq("message_id", params.messageId)
    .eq("player_id", params.playerId)
    .eq("emoji", params.emoji);

  if (error) throw error;
}
