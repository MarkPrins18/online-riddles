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

  // One cream "sheet" listing everything confirmed so far, numbered like a
  // case summary — the counterpart to Verhoor's full back-and-forth.
  return (
    <section className="rounded-[10px] border-[3px] border-ink bg-paper p-5 text-ink shadow-[5px_5px_0_var(--accent)]">
      <h2 className="mb-3 font-display text-[22px] uppercase">{t("heading")}</h2>
      {pinError && <p className="mb-2 text-xs font-bold text-[#b33a28]">{pinError}</p>}
      {clues.length === 0 ? (
        <p className="text-sm font-medium text-ink/75">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {clues.map((clue, index) => (
            <li key={clue.id} className="flex items-baseline gap-2.5 text-[17px] font-bold">
              <span className="font-display font-normal text-[#b33a28]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">{clue.text}</span>
              {onPinToBoard && (
                // Prikbord itself is desktop-only (see GamePlayClient) — this
                // is the only other way to open it, so it needs the same gate.
                <button
                  type="button"
                  onClick={() => handlePin(clue.id)}
                  disabled={pinningId === clue.id}
                  aria-label={pinningId === clue.id ? t("pinning") : t("pin")}
                  title={t("pin")}
                  className="hidden h-7 w-7 shrink-0 cursor-pointer items-center justify-center self-center rounded text-ink/40 transition-colors hover:bg-ink/10 hover:text-[#b33a28] disabled:opacity-50 xl:inline-flex"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
