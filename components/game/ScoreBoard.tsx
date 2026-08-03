import type { Player } from "@/types/player";
import { Badge } from "@/components/ui/Badge";
import { medalForRank } from "@/lib/game/ranking";

export function ScoreBoard({
  players,
  onKick,
}: {
  players: Player[];
  onKick?: (playerId: string) => void;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {ranked.map((player, index) => (
        <li key={player.id} className="flex items-center justify-between gap-2 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-text-secondary">
              {medalForRank(index) ?? String(index + 1).padStart(2, "0")}
            </span>
            <span className="truncate font-mono text-sm text-text-primary">{player.name}</span>
            {player.is_narrator && (
              <Badge tone="accent" className="shrink-0">
                Verteller
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-sm font-semibold text-accent-secondary">{player.score}</span>
            {onKick && !player.is_host && (
              <button
                type="button"
                onClick={() => onKick(player.id)}
                aria-label={`Verwijder ${player.name}`}
                className="font-mono text-xs text-text-secondary hover:text-danger"
              >
                ✕
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
