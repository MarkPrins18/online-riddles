import { useTranslations } from "next-intl";
import type { Player } from "@/types/player";
import { Badge } from "@/components/ui/Badge";

export function ScoreBoard({
  players,
  onKick,
  onlinePlayerIds,
}: {
  players: Player[];
  onKick?: (playerId: string) => void;
  onlinePlayerIds?: Set<string>;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const t = useTranslations("PlayerList");

  return (
    <ul className="flex flex-col divide-y divide-dashed divide-[#3a3a3a]">
      {ranked.map((player, index) => (
        <li key={player.id} className="flex items-center justify-between gap-2 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`w-5 shrink-0 font-display ${index === 0 ? "text-accent" : "text-[#8c8578]"}`}>
              {index + 1}
            </span>
            {onlinePlayerIds && (
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  onlinePlayerIds.has(player.id) ? "bg-accent" : "border-2 border-[#5a5a5a]"
                }`}
              >
                <span className="sr-only">
                  {onlinePlayerIds.has(player.id) ? t("online") : t("offline")}
                </span>
              </span>
            )}
            <span className="truncate text-base text-text-primary">{player.name}</span>
            {player.is_narrator && (
              <Badge tone="accent" className="shrink-0">
                {t("narratorBadge")}
              </Badge>
            )}
            {player.is_spectator && (
              <Badge tone="neutral" className="shrink-0">
                {t("spectatorBadge")}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-base font-extrabold tabular-nums text-text-primary">{player.score}</span>
            {onKick && !player.is_host && (
              <button
                type="button"
                onClick={() => onKick(player.id)}
                aria-label={t("removeAriaLabel", { name: player.name })}
                className="rounded p-2.5 text-sm text-text-secondary transition-colors hover:text-danger"
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
