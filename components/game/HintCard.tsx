export function HintCard({ hint }: { hint: string }) {
  return (
    <div
      className="w-full rounded-md border-l-4 border-dashed border-l-[#3d2609] bg-paper p-4 text-ink shadow-sm"
      style={{ animation: "reveal-in 180ms ease-out" }}
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-[#3d2609]">Hint</p>
      <p className="mt-1.5 font-serif text-base font-medium leading-snug">{hint}</p>
    </div>
  );
}
