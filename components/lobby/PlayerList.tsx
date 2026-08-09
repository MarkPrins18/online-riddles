import { useTranslations } from "next-intl";
import type { Player } from "@/types/player";
import { Badge } from "@/components/ui/Badge";

export function PlayerList({
  players,
  onKick,
  onlinePlayerIds,
}: {
  players: Player[];
  onKick?: (playerId: string) => void;
  onlinePlayerIds?: Set<string>;
}) {
  const t = useTranslations("PlayerList");

  if (players.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between py-2.5"
        >
          <span className="flex items-center gap-2 font-mono text-sm text-text-primary">
            {onlinePlayerIds && (
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  onlinePlayerIds.has(player.id) ? "bg-accent" : "bg-text-secondary/30"
                }`}
              >
                <span className="sr-only">
                  {onlinePlayerIds.has(player.id) ? t("online") : t("offline")}
                </span>
              </span>
            )}
            {player.name}
          </span>
          <div className="flex items-center gap-1.5">
            {player.is_narrator && <Badge tone="accent">{t("narratorBadge")}</Badge>}
            {player.is_host && <Badge tone="neutral">{t("hostBadge")}</Badge>}
            {player.is_spectator && <Badge tone="neutral">{t("spectatorBadge")}</Badge>}
            {onKick && !player.is_host && (
              <button
                type="button"
                onClick={() => onKick(player.id)}
                aria-label={t("removeAriaLabel", { name: player.name })}
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
