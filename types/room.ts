export type RoomStatus = "lobby" | "playing" | "revealed" | "finished";

export type Room = {
  id: string;
  code: string;
  status: RoomStatus;
  narrator_id: string | null;
  current_puzzle_id: string | null;
  round: number;
  round_started_at: string | null;
  played_puzzle_ids: string[];
  round_duration_seconds: number | null;
  max_rounds: number;
  pack_theme_filter: string[] | null;
  community_pack_ids: string[] | null;
  hardcore_mode: boolean;
  team_lives_total: number | null;
  team_lives_remaining: number | null;
  host_id: string;
  created_at: string;
  revealed_at: string | null;
};

export type RoomSettingsInput = {
  roundDurationSeconds: number | null;
  maxRounds: number;
  packThemeFilter: string[];
  /** null = every published community pack, [] = none, else an explicit pack-id subset. */
  communityPackIds: string[] | null;
  hardcoreMode: boolean;
  teamLives: number;
};
