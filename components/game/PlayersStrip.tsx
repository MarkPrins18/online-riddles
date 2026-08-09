import { useTranslations } from "next-intl";
import type { Player } from "@/types/player";

const MAX_VISIBLE = 4;

function initialsFor(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/**
 * Compact "who's here" strip for the status bar — always visible, unlike the
 * scoreboard/case-log detail which stays behind the Spelers-drawer. Costs a
 * couple of pixels of height, never competes with the growing lists below.
 */
export function PlayersStrip({
  players,
  narratorId,
  onOpen,
}: {
  players: Player[];
  narratorId: string | null;
  onOpen: () => void;
}) {
  const visible = players.slice(0, MAX_VISIBLE);
  const overflow = players.length - visible.length;
  const t = useTranslations("PlayersStrip");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-1.5 rounded-sm px-1 py-1 transition-opacity hover:opacity-80"
      aria-label={t("ariaLabel", { count: players.length })}
    >
      <span className="flex -space-x-1.5">
        {visible.map((player) => (
          <span
            key={player.id}
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
              player.id === narratorId
                ? "border-accent bg-accent/20 text-accent"
                : "border-white/15 bg-bg-secondary text-text-secondary"
            } font-mono text-[10px]`}
            title={player.name}
          >
            {initialsFor(player.name)}
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-bg-secondary font-mono text-[10px] text-text-secondary">
            +{overflow}
          </span>
        )}
      </span>
      <span className="hidden font-mono text-xs text-text-secondary sm:inline">
        {t("count", { count: players.length })}
      </span>
    </button>
  );
}
