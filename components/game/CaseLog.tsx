import { useTranslations } from "next-intl";
import type { CaseLogEntry } from "@/types/caseLog";

/** Live, growing record of every round played this session — visible to everyone. */
export function CaseLog({ entries }: { entries: CaseLogEntry[] }) {
  const t = useTranslations("CaseLog");
  const tDifficulty = useTranslations("Difficulty");

  if (entries.length === 0) return null;

  const ordered = [...entries].sort((a, b) => b.round - a.round);

  return (
    <div>
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-text-secondary">
        {t("heading")}
      </p>
      <ul className="flex max-h-48 flex-col gap-6 overflow-y-auto">
        {ordered.map((entry) => (
          <li key={entry.id} className="font-mono text-xs">
            <span className="text-text-primary">
              {t("caseLabel", { round: entry.round + 1, difficulty: tDifficulty(entry.difficulty) })}
            </span>
            <p className="mt-0.5 text-text-secondary">
              {entry.puzzle_title} —{" "}
              {entry.outcome === "solved" ? (
                <span className="text-accent-secondary">
                  {t("solvedBy", { name: entry.solver_name ?? "", count: entry.questions_asked })}
                </span>
              ) : (
                <span className="text-danger">{t("unsolved")}</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
