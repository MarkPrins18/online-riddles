import { useTranslations } from "next-intl";
import { RevealCard } from "@/components/ui/RevealCard";
import { Button } from "@/components/ui/Button";

/**
 * The Verteller hasn't seen this puzzle before — it's assigned at random —
 * so reading it is a required step, not optional reference material.
 * Deliberately a `Dialog` moment like GameOverScreen, not a Drawer: no
 * close button, no backdrop-click, no Escape — the "Ik ken de zaak" button
 * is the only way through, so there's no ambiguity about needing to
 * dismiss it before Postvak becomes reachable.
 */
export function NarratorBriefingScreen({
  title,
  scenario,
  solution,
  onAcknowledge,
  onSkip,
  isSkipping,
  skipError,
}: {
  title: string;
  scenario: string;
  solution: string;
  onAcknowledge: () => void;
  onSkip: () => void;
  isSkipping: boolean;
  skipError: string | null;
}) {
  const t = useTranslations("NarratorBriefingScreen");

  return (
    <RevealCard label={t("newCase")} title={title}>
      <p className="text-lg leading-relaxed text-text-primary/90">{scenario}</p>

      <div className="mt-6 rounded-[10px] border-[3px] border-ink bg-paper p-5 text-ink">
        <p className="text-sm font-extrabold">{t("onlyForYou")}</p>
        <p className="mt-1.5 text-lg font-medium leading-relaxed">{solution}</p>
      </div>

      <Button className="mt-8 w-full py-3.5 text-xl" onClick={onAcknowledge}>
        {t("start")}
      </Button>
      <Button
        variant="ghost"
        className="mt-2 w-full"
        onClick={onSkip}
        disabled={isSkipping}
      >
        {isSkipping ? t("skipping") : t("skip")}
      </Button>
      {skipError && <p className="mt-2 text-sm text-danger">{skipError}</p>}
    </RevealCard>
  );
}
