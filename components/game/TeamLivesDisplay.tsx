/** Shared, visible to every player — this is team-wide stakes, not a secret. */
export function TeamLivesDisplay({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const hearts = Array.from({ length: total }, (_, i) => i < remaining);

  return (
    <span className="font-mono text-sm tracking-wide" aria-label={`${remaining} van ${total} levens over`}>
      {hearts.map((filled, i) => (
        <span key={i} className={filled ? "text-danger" : "text-text-secondary/30"}>
          {filled ? "❤" : "🖤"}
        </span>
      ))}
    </span>
  );
}
