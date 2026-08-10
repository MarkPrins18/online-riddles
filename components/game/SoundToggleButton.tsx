"use client";

import { useTranslations } from "next-intl";
import { useSoundEnabled } from "@/lib/sound/useSoundEnabled";
import { Button } from "@/components/ui/Button";

/** Mutes/unmutes the short sound + haptic cues (hint, guess result, final countdown) — persisted per browser via localStorage. */
export function SoundToggleButton({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useSoundEnabled();
  const t = useTranslations("SoundToggleButton");

  return (
    <Button
      type="button"
      variant="secondary"
      iconOnly
      onClick={() => setEnabled(!enabled)}
      aria-label={enabled ? t("muteLabel") : t("unmuteLabel")}
      aria-pressed={!enabled}
      className={className}
    >
      {enabled ? (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h3l4-3.5v12l-4-3.5H3v-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7c1 .8 1 5.2 0 6M15.5 5c2 1.8 2 8.2 0 10" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h3l4-3.5v12l-4-3.5H3v-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 7.5l4 5M17.5 7.5l-4 5" />
        </svg>
      )}
    </Button>
  );
}
