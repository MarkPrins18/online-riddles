"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Hint } from "@/types/hint";

const VISIBLE_MS = 6000;

/**
 * A transient attention-grabber for a freshly sent hint — the hint itself
 * already lives permanently in the InterrogationLog (see HintCard there);
 * this is only the "look, something happened" nudge for whoever isn't on
 * that tab right now. Auto-dismisses; never the only place a hint appears.
 */
export function HintSnackbar({ latestHint }: { latestHint: Hint | null }) {
  const [visibleHint, setVisibleHint] = useState<Hint | null>(null);
  const seenIdRef = useRef<string | null>(null);
  const t = useTranslations("HintSnackbar");

  useEffect(() => {
    if (!latestHint || latestHint.id === seenIdRef.current) return;
    seenIdRef.current = latestHint.id;
    setVisibleHint(latestHint);
    const timer = setTimeout(() => setVisibleHint(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [latestHint]);

  if (!visibleHint) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <div
        role="status"
        aria-live="polite"
        className="max-w-md rounded-lg border border-l-4 border-white/10 border-l-[#3d2609] bg-bg-case/95 px-4 py-3 shadow-xl shadow-black/50"
        style={{ animation: "reveal-in 180ms ease-out" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          {t("label", { name: visibleHint.player_name })}
        </p>
        <p className="mt-1 font-serif text-sm text-text-primary">{visibleHint.text}</p>
      </div>
    </div>
  );
}
