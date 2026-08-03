import type { Player } from "@/types/player";
import { Badge } from "@/components/ui/Badge";

export function PlayerList({
  players,
  onKick,
}: {
  players: Player[];
  onKick?: (playerId: string) => void;
}) {
  if (players.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">
        Nog niemand aanwezig.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between py-2.5"
        >
          <span className="font-mono text-sm text-text-primary">
            {player.name}
          </span>
          <div className="flex items-center gap-1.5">
            {player.is_narrator && <Badge tone="accent">Verteller</Badge>}
            {player.is_host && <Badge tone="neutral">Host</Badge>}
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
