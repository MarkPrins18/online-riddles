"use client";

import { useSyncExternalStore } from "react";
import { isSoundEnabled, setSoundEnabled, subscribeSoundEnabled } from "./soundEffects";

/** Reactive view of the mute toggle, persisted per browser in localStorage. */
export function useSoundEnabled(): [boolean, (next: boolean) => void] {
  const enabled = useSyncExternalStore(subscribeSoundEnabled, isSoundEnabled, () => true);
  return [enabled, setSoundEnabled];
}
