import { useTranslations } from "next-intl";
import type { Guess } from "@/types/guess";
import type { Question } from "@/types/question";
import { Button } from "@/components/ui/Button";

/**
 * Private to the Verteller: the solution plus a running tally of how badly
 * the group is floundering (wrong-guess trail NarratorGuessControls drops
 * once reviewed). Merged into one bordered block instead of two separate
 * "alleen voor jou" sections — same private info, one label, one box.
 */
export function NarratorTensionPanel({
  solution,
  guesses,
  questions,
  onSkip,
  isSkipping,
  skipError,
}: {
  solution: string;
  guesses: Guess[];
  questions: Question[];
  onSkip: () => void;
  isSkipping: boolean;
  skipError: string | null;
}) {
  const incorrectGuesses = [...guesses].filter((g) => g.status === "incorrect").reverse();
  const answeredCount = questions.filter((q) => q.answer !== null).length;
  const t = useTranslations("NarratorTensionPanel");

  return (
    <div className="relative rounded-[10px] border-[3px] border-ink bg-paper p-5 text-ink shadow-[5px_5px_0_var(--accent)]">
      <p className="mb-2 font-display text-xl uppercase text-ink">
        {t("onlyForYou")}
      </p>
      <p className="text-base leading-relaxed text-ink">{solution}</p>
      <p className="mt-4 border-t border-ink/20 border-dashed pt-4 text-sm text-ink/70">
        <span className={incorrectGuesses.length > 0 ? "font-extrabold text-[#b33a28]" : undefined}>
          {t("wrongGuesses", { count: incorrectGuesses.length })}
        </span>
        {" · "}
        {t("questionsAnswered", { count: answeredCount })}
      </p>
      {incorrectGuesses.length > 0 && (
        <ul className="mt-3 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
          {incorrectGuesses.map((guess) => (
            <li key={guess.id} className="text-sm text-ink/70">
              <span className="text-ink">{guess.player_name}</span>: {guess.text}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-ink/20 border-dashed pt-4">
        <Button variant="ghost" className="w-full text-ink/70! hover:text-ink!" onClick={onSkip} disabled={isSkipping}>
          {isSkipping ? t("skipping") : t("skip")}
        </Button>
        {skipError && <p className="mt-2 text-sm font-bold text-[#b33a28]">{skipError}</p>}
      </div>
    </div>
  );
}
