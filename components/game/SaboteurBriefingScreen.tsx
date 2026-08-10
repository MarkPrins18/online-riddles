import { useTranslations } from "next-intl";
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
    <div
      className="redact-reveal rounded-lg border border-danger/40 bg-bg-secondary p-6 shadow-lg shadow-danger/10 sm:p-8"
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-danger">{t("label")}</p>
      <h2 className="mt-2 font-serif text-2xl text-text-primary">{t("heading")}</h2>
      <p className="mt-3 font-serif text-base leading-relaxed text-text-primary/90">
        {t("instructions")}
      </p>

      <p className="mt-6 border-t border-white/5 pt-4 font-mono text-xs uppercase tracking-widest text-text-secondary">
        {t("solutionLabel")}
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed text-text-primary/90">{solution}</p>

      <Button variant="secondary" className="mt-8 w-full" onClick={onAcknowledge}>
        {t("start")}
      </Button>
    </div>
  );
}
