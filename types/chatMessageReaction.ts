export type ChatMessageReaction = {
  id: string;
  room_id: string;
  message_id: string;
  player_id: string;
  // Free-form (any emoji from the sender's own keyboard/picker), validated
  // client-side by lib/game/emoji.ts and length-checked in the database —
  // not restricted to a fixed set.
  emoji: string;
  created_at: string;
};
