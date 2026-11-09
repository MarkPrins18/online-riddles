import { useTranslations } from "next-intl";
import { RevealCard, StandingsList } from "@/components/ui/RevealCard";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { Button } from "@/components/ui/Button";
import { SessionRecapPanel } from "./SessionRecapPanel";
import { ShareRecapButton } from "./ShareRecapButton";

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
  const t = useTranslations("GameOverScreen");

  return (
    <RevealCard tone="danger" label={t("gameOver")} title={t("heading")} subtitle={t("subtitle")}>
      <StandingsList players={ranked} tone="danger" />

      <SessionRecapPanel supabase={supabase} roomId={roomId} bare />

      <div className="mt-8">
        <ShareRecapButton supabase={supabase} roomId={roomId} players={players} />
      </div>

      {isHost && (
        <Button variant="secondary" className="mt-3 w-full py-3" onClick={onNewGame}>
          {t("newGame")}
        </Button>
      )}
    </RevealCard>
  );
}
