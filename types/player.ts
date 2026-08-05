export type Player = {
  id: string;
  room_id: string;
  user_id: string | null;
  name: string;
  is_narrator: boolean;
  score: number;
  is_host: boolean;
  is_spectator: boolean;
  joined_at: string;
};

export type PlayerPresence = {
  player_id: string;
  name: string;
  online_at: string;
};
