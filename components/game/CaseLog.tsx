import type { CaseLogEntry } from "@/types/caseLog";

const DIFFICULTY_LABEL: Record<CaseLogEntry["difficulty"], string> = {
  easy: "makkelijk",
  medium: "gemiddeld",
  hard: "moeilijk",
};

/** Live, growing record of every round played this session — visible to everyone. */
export function CaseLog({ entries }: { entries: CaseLogEntry[] }) {
  if (entries.length === 0) return null;

  const ordered = [...entries].sort((a, b) => b.round - a.round);

  return (
    <div>
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-text-secondary">
        Zaken-archief
      </p>
      <ul className="flex max-h-48 flex-col gap-6 overflow-y-auto">
        {ordered.map((entry) => (
          <li key={entry.id} className="font-mono text-xs">
            <span className="text-text-primary">
              Zaak {entry.round + 1} · {DIFFICULTY_LABEL[entry.difficulty]}
            </span>
            <p className="mt-0.5 text-text-secondary">
              {entry.puzzle_title} —{" "}
              {entry.outcome === "solved" ? (
                <span className="text-accent-secondary">
                  opgelost door {entry.solver_name} ({entry.questions_asked} vragen)
                </span>
              ) : (
                <span className="text-danger">onopgelost</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
