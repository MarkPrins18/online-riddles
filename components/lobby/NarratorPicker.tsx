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
      <legend className="mb-1 font-mono text-xs uppercase tracking-widest text-text-secondary">
        {t("legend")}
      </legend>

      <label className="flex items-center gap-2 rounded-md border border-white/10 bg-bg-primary/60 px-3 py-2 font-mono text-sm text-text-primary">
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
          className="flex items-center gap-2 rounded-md border border-white/10 bg-bg-primary/60 px-3 py-2 font-mono text-sm text-text-primary"
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
