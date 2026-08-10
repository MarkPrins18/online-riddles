"use client";

const STORAGE_KEY = "dark-riddles:recent-emojis";
const MAX_RECENT = 8;

// Shown until the player has picked anything themselves — a sensible
// starting point for the quick-reaction bar, not a restriction (see
// lib/game/emoji.ts for the free-text picker fallback).
const DEFAULT_EMOJIS = ["👍", "😂", "😱", "❤️", "😢", "🔥"];

export function getRecentEmojis(): string[] {
  if (typeof window === "undefined") return DEFAULT_EMOJIS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: string[] = stored ? JSON.parse(stored) : [];
    const merged = [...parsed, ...DEFAULT_EMOJIS.filter((e) => !parsed.includes(e))];
    return merged.slice(0, MAX_RECENT);
  } catch {
    return DEFAULT_EMOJIS;
  }
}

export function recordEmojiUse(emoji: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [emoji, ...getRecentEmojis().filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort — worst case the quick bar just falls back to defaults.
  }
}
