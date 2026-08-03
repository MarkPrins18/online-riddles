/** Centered, non-blocking banner — visible to every player, not just the host. */
export function NextRoundCountdown({ seconds }: { seconds: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="rounded-lg border border-accent/30 bg-bg-case/95 px-8 py-6 text-center shadow-xl shadow-black/50">
        <p className="font-mono text-sm uppercase tracking-widest text-accent">
          Volgende ronde gaat beginnen!
        </p>
        <p className="mt-2 font-serif text-5xl text-text-primary">{seconds}</p>
      </div>
    </div>
  );
}
