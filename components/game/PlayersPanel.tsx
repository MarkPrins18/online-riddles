"use client";

import { useTranslations } from "next-intl";
import type { Player } from "@/types/player";

/**
 * Always-visible standings for wide screens: raders ranked by score, the
 * Verteller listed apart (they don't compete this round). Everything else
 * about players (online state, case log, kicking) stays in PlayersDrawer,
 * one click away via "Details".
 */
export function PlayersPanel({
  players,
  narratorId,
  playerId,
  onOpenDetails,
}: {
  players: Player[];
  narratorId: string | null;
  playerId: string;
  onOpenDetails: () => void;
}) {
  const t = useTranslations("GamePlayClient");
  const tList = useTranslations("PlayerList");

  const ranked = players
    .filter((p) => p.id !== narratorId && !p.is_spectator)
    .sort((a, b) => b.score - a.score);
  const narrator = players.find((p) => p.id === narratorId);

  return (
    <section className="rounded-[10px] border-2 border-border bg-bg-secondary px-5 py-[18px]">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl uppercase text-accent">{t("playersHeading")}</h2>
        <button
          type="button"
          onClick={onOpenDetails}
          className="cursor-pointer text-xs font-bold text-text-secondary underline underline-offset-2 hover:text-accent"
        >
          {t("playersDetails")}
        </button>
      </div>
      <ol className="flex flex-col gap-2 text-base">
        {ranked.map((player, index) => {
          const isMe = player.id === playerId;
          return (
            <li key={player.id} className="flex items-baseline gap-2.5">
              <span
                className={`w-[18px] shrink-0 font-display ${index === 0 ? "text-accent" : "text-[#8c8578]"}`}
              >
                {index + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate ${isMe ? "font-extrabold" : ""}`}>
                {player.name} {isMe && t("youMarker")}
              </span>
              <span className="font-extrabold tabular-nums">{player.score}</span>
            </li>
          );
        })}
        {narrator && (
          <li className="flex items-baseline gap-2.5 border-t border-dashed border-[#3a3a3a] pt-2">
            <span className="w-[18px] shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {narrator.name} {narrator.id === playerId && t("youMarker")}
            </span>
            <span className="bg-accent px-2 py-px text-xs font-extrabold uppercase text-ink">
              {tList("narratorBadge")}
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}
