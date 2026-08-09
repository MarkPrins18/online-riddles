import { useTranslations } from "next-intl";
import type { Guess } from "@/types/guess";
import { Badge } from "@/components/ui/Badge";

/**
 * Private to the guessing player: shows only their own latest guess and
 * whether the Verteller has reviewed it yet. Other players never see this.
 */
export function MyGuessFeedback({
  guesses,
  playerId,
}: {
  guesses: Guess[];
  playerId: string;
}) {
  const own = guesses.filter((g) => g.player_id === playerId);
  const latest = own[own.length - 1];
  const t = useTranslations("MyGuessFeedback");

  if (!latest) return null;

  return (
    <p className="mt-2 font-mono text-xs text-text-secondary">
      {t("latestGuess", { text: latest.text })}{" "}
      {latest.status === "pending" && <Badge tone="neutral">{t("pending")}</Badge>}
      {latest.status === "incorrect" && <Badge tone="danger">{t("incorrect")}</Badge>}
    </p>
  );
}
