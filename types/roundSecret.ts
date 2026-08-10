// Only ever populated for the round's saboteur themselves, until the
// accusation vote closes and `revealed` flips to true — see
// round_secrets' RLS policy in supabase/schema.sql.
export type RoundSecret = {
  id: string;
  room_id: string;
  round: number;
  saboteur_id: string;
  revealed: boolean;
  created_at: string;
};
