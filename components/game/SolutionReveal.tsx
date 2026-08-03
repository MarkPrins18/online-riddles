import type { Puzzle } from "@/types/puzzle";

export function SolutionReveal({
  puzzle,
  solverName,
}: {
  puzzle: Puzzle;
  solverName?: string;
}) {
  return (
    <div
      className="redact-reveal rounded-lg border border-accent/40 bg-bg-secondary p-6 shadow-lg shadow-accent/10"
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        Zaak gesloten
      </p>
      <h2 className="mt-2 font-serif text-2xl text-text-primary">{puzzle.title}</h2>
      <p className="mt-1 font-mono text-sm text-accent">
        {solverName ? `Opgelost door ${solverName}` : "Niemand loste deze zaak op"}
      </p>
      <p className="mt-4 font-serif text-base leading-relaxed text-text-primary/90">
        {puzzle.solution}
      </p>
    </div>
  );
}
