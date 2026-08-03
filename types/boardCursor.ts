/** Ephemeral broadcast payload — not a database row. */
export type BoardCursor = {
  player_id: string;
  name: string;
  x: number;
  y: number;
};
