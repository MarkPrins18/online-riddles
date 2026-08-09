"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Question } from "@/types/question";
import { getErrorMessage } from "@/lib/errors";

/**
 * "Aanwijzingen" — every question the Verteller answered "ja", filtered out
 * of the full Verhoor transcript so confirmed knowledge doesn't drown in the
 * back-and-forth. Same `questions` data as Verhoor, just a narrower view.
 */
export function CluesList({
  questions,
  onPinToBoard,
}: {
  questions: Question[];
  onPinToBoard?: (questionId: string) => Promise<void>;
}) {
  const clues = questions.filter((q) => q.answer === "yes");
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const t = useTranslations("CluesList");

  if (clues.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  async function handlePin(questionId: string) {
    if (!onPinToBoard) return;
    setPinningId(questionId);
    setPinError(null);
    try {
      await onPinToBoard(questionId);
    } catch (err) {
      setPinError(getErrorMessage(err, t("error")));
    }
    setPinningId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {pinError && <p className="font-mono text-xs text-danger">{pinError}</p>}
      {clues.map((clue) => (
        <div
          key={clue.id}
          className="w-full rounded-md border-l-4 border-l-[#3d2609] bg-paper p-3 text-ink shadow-sm"
        >
          <p className="font-serif text-base font-medium leading-snug">
            {clue.text}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-black/10 pt-2">
            <p className="font-mono text-[11px] text-black/55">
              — {clue.player_name}
            </p>
            {onPinToBoard && (
              // Prikbord itself is desktop-only (see GamePlayClient) — this
              // is the only other way to open it, so it needs the same gate.
              <button
                type="button"
                onClick={() => handlePin(clue.id)}
                disabled={pinningId === clue.id}
                className="hidden font-mono text-[11px] uppercase tracking-widest text-[#3d2609] hover:text-black disabled:opacity-50 xl:inline"
              >
                {pinningId === clue.id ? t("pinning") : t("pin")}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
