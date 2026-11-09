import { useTranslations } from "next-intl";
import type { Player } from "@/types/player";
import type { NarratorSelection } from "@/lib/game/roles";

export function NarratorPicker({
  players,
  selection,
  onChange,
}: {
  players: Player[];
  selection: NarratorSelection;
  onChange: (selection: NarratorSelection) => void;
}) {
  const t = useTranslations("NarratorPicker");

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-3 font-display text-xl uppercase text-accent">
        {t("legend")}
      </legend>

      <label className="flex items-center gap-2 cursor-pointer rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base text-text-primary has-[:checked]:border-accent">
        <input
          type="radio"
          name="narrator"
          className="accent-accent"
          checked={selection.mode === "auto"}
          onChange={() => onChange({ mode: "auto" })}
        />
        {t("autoRotate")}
      </label>

      {players.map((player) => (
        <label
          key={player.id}
          className="flex items-center gap-2 cursor-pointer rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base text-text-primary has-[:checked]:border-accent"
        >
          <input
            type="radio"
            name="narrator"
            className="accent-accent"
            checked={selection.mode === "manual" && selection.playerId === player.id}
            onChange={() => onChange({ mode: "manual", playerId: player.id })}
          />
          {player.name}
        </label>
      ))}
    </fieldset>
  );
}
