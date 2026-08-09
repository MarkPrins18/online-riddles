import { useTranslations } from "next-intl";
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
    <div
      className="redact-reveal rounded-lg border border-accent/40 bg-bg-secondary p-6 shadow-lg shadow-accent/10 sm:p-8"
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-accent">{t("newCase")}</p>
      <h2 className="mt-2 font-serif text-2xl text-text-primary">{title}</h2>
      <p className="mt-3 font-serif text-base leading-relaxed text-text-primary/90">{scenario}</p>

      <p className="mt-6 border-t border-white/5 pt-4 font-mono text-xs uppercase tracking-widest text-text-secondary">
        {t("onlyForYou")}
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed text-text-primary/90">{solution}</p>

      <Button variant="secondary" className="mt-8 w-full" onClick={onAcknowledge}>
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
      {skipError && <p className="mt-2 font-mono text-xs text-danger">{skipError}</p>}
    </div>
  );
}
