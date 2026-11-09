import { useTranslations } from "next-intl";
import { RevealCard } from "@/components/ui/RevealCard";
import { Button } from "@/components/ui/Button";

/**
 * The saboteur's private, one-time briefing for this round — same required-
 * reading pattern as NarratorBriefingScreen (a Dialog with only one way
 * through), but styled with `danger` instead of `accent` to read as a
 * different, more ominous kind of secret. Deliberately doesn't repeat the
 * scenario text — the saboteur is a normal rader and already sees that on
 * the regular case dossier card; this only needs to add what a rader
 * wouldn't otherwise know: the actual solution.
 */
export function SaboteurBriefingScreen({
  solution,
  onAcknowledge,
}: {
  solution: string;
  onAcknowledge: () => void;
}) {
  const t = useTranslations("SaboteurBriefingScreen");

  return (
    <RevealCard tone="danger" label={t("label")} title={t("heading")}>
      <p className="text-lg leading-relaxed text-text-primary/90">{t("instructions")}</p>

      <div className="mt-6 rounded-[10px] border-[3px] border-ink bg-paper p-5 text-ink">
        <p className="text-sm font-extrabold">{t("solutionLabel")}</p>
        <p className="mt-1.5 text-lg font-medium leading-relaxed">{solution}</p>
      </div>

      <Button variant="danger" className="mt-8 w-full py-3.5 text-xl" onClick={onAcknowledge}>
        {t("start")}
      </Button>
    </RevealCard>
  );
}
