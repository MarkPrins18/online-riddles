"use client";

import { useCallback, useRef } from "react";

const PRESS_HOLD_MS = 400;

/**
 * Long-press (mouse or touch, via Pointer Events so one handler covers
 * both) — the "hold a chat bubble to react" gesture, instead of a
 * persistently visible button cluttering every message.
 */
export function usePressHold(onHold: () => void) {
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    timerRef.current = window.setTimeout(onHold, PRESS_HOLD_MS);
  }, [clear, onHold]);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
