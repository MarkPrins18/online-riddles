import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { Button } from "@/components/ui/Button";
import { medalForRank } from "@/lib/game/ranking";
import { SessionRecapPanel } from "./SessionRecapPanel";
import { ShareRecapButton } from "./ShareRecapButton";

export function FinalScoreboard({
  supabase,
  roomId,
  players,
  isHost,
  onPlayAnotherRound,
  onNewGame,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  players: Player[];
  isHost: boolean;
  onPlayAnotherRound: () => void;
  onNewGame: () => void;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const t = useTranslations("FinalScoreboard");

  return (
    <div
      className="redact-reveal rounded-lg border border-accent/40 bg-bg-secondary p-8 shadow-lg shadow-accent/10 sm:p-10"
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        {t("caseFileClosed")}
      </p>
      <h2 className="mt-3 font-serif text-3xl text-text-primary">{t("gameOver")}</h2>
      {winner && (
        <p className="mt-2 font-mono text-sm text-accent">
          {t("winner", { name: winner.name, score: winner.score })}
        </p>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-white/5">
        {ranked.map((player, index) => (
          <li key={player.id} className="flex items-center justify-between py-3">
            <span className="font-mono text-sm text-text-primary">
              {medalForRank(index) ?? `${index + 1}.`} {player.name}
            </span>
            <span className="font-mono text-sm font-semibold text-accent">{player.score}</span>
          </li>
        ))}
      </ul>

      <SessionRecapPanel supabase={supabase} roomId={roomId} bare />

      <div className="mt-8">
        <ShareRecapButton supabase={supabase} roomId={roomId} players={players} />
      </div>

      {isHost && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Button className="w-full" onClick={onPlayAnotherRound}>
            {t("playAnotherRound")}
          </Button>
          <Button variant="secondary" className="w-full" onClick={onNewGame}>
            {t("newGame")}
          </Button>
        </div>
      )}
    </div>
  );
}
