import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { Button } from "@/components/ui/Button";
import { medalForRank } from "@/lib/game/ranking";
import { SessionRecapPanel } from "./SessionRecapPanel";

/**
 * Terminal state when the team's shared lives (Hardcore modus) hit zero —
 * the whole session ends immediately, no "volgende zaak" available. Visual
 * counterpart to FinalScoreboard, but framed as a loss rather than a finish.
 */
export function GameOverScreen({
  supabase,
  roomId,
  players,
  isHost,
  onNewGame,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  players: Player[];
  isHost: boolean;
  onNewGame: () => void;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <div
      className="redact-reveal rounded-lg border border-danger/40 bg-bg-secondary p-8 shadow-lg shadow-danger/10 sm:p-10"
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-danger">Game over</p>
      <h2 className="mt-3 font-serif text-3xl text-text-primary">
        De zaak blijft voor altijd onopgelost
      </h2>
      <p className="mt-2 font-mono text-sm text-text-secondary">
        Het team is door de levens heen.
      </p>

      <ul className="mt-6 flex flex-col divide-y divide-white/5">
        {ranked.map((player, index) => (
          <li key={player.id} className="flex items-center justify-between py-3">
            <span className="font-mono text-sm text-text-primary">
              {medalForRank(index) ?? `${index + 1}.`} {player.name}
            </span>
            <span className="font-mono text-sm font-semibold text-danger">{player.score}</span>
          </li>
        ))}
      </ul>

      <SessionRecapPanel supabase={supabase} roomId={roomId} bare />

      {isHost && (
        <Button variant="secondary" className="mt-8 w-full" onClick={onNewGame}>
          Nieuw spel starten
        </Button>
      )}
    </div>
  );
}
