import type { Guess } from "@/types/guess";
import type { Question } from "@/types/question";

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
}: {
  solution: string;
  guesses: Guess[];
  questions: Question[];
}) {
  const incorrectGuesses = [...guesses].filter((g) => g.status === "incorrect").reverse();
  const answeredCount = questions.filter((q) => q.answer !== null).length;

  return (
    <div className="relative rounded-lg border border-white/10 bg-bg-primary/40 p-4">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-text-secondary before:mr-2 before:inline-block before:h-3 before:w-6 before:-translate-y-px before:-rotate-3 before:bg-accent/25 before:content-['']">
        Alleen voor jou
      </p>
      <p className="font-serif text-base leading-relaxed text-text-primary/90">{solution}</p>
      <p className="mt-4 border-t border-white/5 pt-4 font-mono text-xs text-text-secondary">
        <span className={incorrectGuesses.length > 0 ? "text-danger" : undefined}>
          {incorrectGuesses.length} foute {incorrectGuesses.length === 1 ? "gok" : "gokken"}
        </span>
        {" · "}
        {answeredCount} vragen beantwoord
      </p>
      {incorrectGuesses.length > 0 && (
        <ul className="mt-3 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
          {incorrectGuesses.map((guess) => (
            <li key={guess.id} className="font-mono text-xs text-text-secondary">
              <span className="text-text-primary">{guess.player_name}</span>: {guess.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
