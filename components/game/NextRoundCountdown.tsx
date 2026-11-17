import { useTranslations } from "next-intl";

/**
 * Non-blocking bottom bar — visible to every player, not just the host.
 * Anchored to the bottom edge (not centered in the viewport) so it never
 * covers the in-flow SolutionReveal text above it, which on narrow screens
 * (single-column layout below xl) often sits right in the viewport middle.
 */
export function NextRoundCountdown({ seconds }: { seconds: number }) {
  const t = useTranslations("NextRoundCountdown");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div
        role="status"
        aria-live="polite"
        className="rounded-[10px] border-2 border-border bg-bg-secondary px-8 py-3 text-center text-text-primary"
      >
        <p className="text-sm font-extrabold text-accent">
          {t("heading")}
        </p>
        {/* aria-hidden: the ticking number would otherwise re-trigger the
            live-region announcement every second — the static heading above
            already tells screen-reader users what's happening once. */}
        <p aria-hidden="true" className="mt-1 font-display text-5xl text-text-primary">
          {seconds}
        </p>
      </div>
    </div>
  );
}
