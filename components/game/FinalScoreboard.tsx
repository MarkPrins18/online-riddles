import { useTranslations } from "next-intl";
import { RevealCard, StandingsList } from "@/components/ui/RevealCard";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { Button } from "@/components/ui/Button";
import { SessionRecapPanel } from "./SessionRecapPanel";
import { ShareRecapButton } from "./ShareRecapButton";

export function FinalScoreboard({
  supabase,
  roomId,
  players,
  isHost,
  onPlayAnotherRound,
  isAdvancing = false,
  onNewGame,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  players: Player[];
  isHost: boolean;
  onPlayAnotherRound: () => void;
  isAdvancing?: boolean;
  onNewGame: () => void;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const t = useTranslations("FinalScoreboard");

  return (
    <RevealCard
      label={t("caseFileClosed")}
      title={t("gameOver")}
      subtitle={winner ? t("winner", { name: winner.name, score: winner.score }) : undefined}
    >
      <StandingsList players={ranked} />

      <SessionRecapPanel supabase={supabase} roomId={roomId} bare />

      <div className="mt-8">
        <ShareRecapButton supabase={supabase} roomId={roomId} players={players} />
      </div>

      {isHost && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Button className="w-full py-3" onClick={onPlayAnotherRound} disabled={isAdvancing}>
            {t("playAnotherRound")}
          </Button>
          <Button variant="secondary" className="w-full py-3" onClick={onNewGame}>
            {t("newGame")}
          </Button>
        </div>
      )}
    </RevealCard>
  );
}
