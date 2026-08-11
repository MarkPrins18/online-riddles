"use client";

import { useEffect, useRef } from "react";
import type { GuessStatus } from "@/types/guess";
import {
  playCorrectSound,
  playHintSound,
  playIncorrectSound,
  playTickSound,
} from "@/lib/sound/soundEffects";

const TICK_THRESHOLD_SECONDS = 10;

/**
 * Fires short sound/haptic cues on the moments players actually feel
 * tension: a new hint from the Verteller, their own guess resolving, and
 * the final countdown seconds. Driven by refs (not state) so a cue plays
 * exactly once per transition, not once per render.
 */
export function useGameSoundEffects({
  latestHintId,
  myLatestGuessId,
  myLatestGuessStatus,
  remainingSeconds,
}: {
  latestHintId: string | null;
  myLatestGuessId: string | null;
  myLatestGuessStatus: GuessStatus | null;
  remainingSeconds: number | null;
}) {
  const prevHintIdRef = useRef(latestHintId);
  useEffect(() => {
    if (latestHintId && latestHintId !== prevHintIdRef.current) playHintSound();
    prevHintIdRef.current = latestHintId;
  }, [latestHintId]);

  // Keyed on id+status (not status alone) so a second wrong guess still
  // cues even though its status string is the same as the first one's.
  const prevGuessKeyRef = useRef(
    myLatestGuessId ? `${myLatestGuessId}:${myLatestGuessStatus}` : null
  );
  useEffect(() => {
    const key = myLatestGuessId ? `${myLatestGuessId}:${myLatestGuessStatus}` : null;
    if (key === prevGuessKeyRef.current) return;
    prevGuessKeyRef.current = key;
    if (myLatestGuessStatus === "correct") playCorrectSound();
    else if (myLatestGuessStatus === "incorrect") playIncorrectSound();
  }, [myLatestGuessId, myLatestGuessStatus]);

  const lastTickSecondRef = useRef<number | null>(null);
  useEffect(() => {
    if (remainingSeconds == null) {
      lastTickSecondRef.current = null;
      return;
    }
    const wholeSecond = Math.ceil(remainingSeconds);
    if (wholeSecond <= 0 || wholeSecond > TICK_THRESHOLD_SECONDS) return;
    if (lastTickSecondRef.current === wholeSecond) return;
    lastTickSecondRef.current = wholeSecond;
    playTickSound();
  }, [remainingSeconds]);
}
