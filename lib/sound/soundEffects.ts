"use client";

const STORAGE_KEY = "dark-riddles:sound-enabled";

type Listener = () => void;
const listeners = new Set<Listener>();
let enabled = readInitialEnabled();

function readInitialEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSoundEnabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  // Browsers suspend a freshly created context until a user gesture has
  // happened somewhere on the page — by the time these cues fire (a guess
  // was submitted, a room was joined) that's already true, so this just
  // covers the odd case where it isn't.
  if (audioContext.state === "suspended") void audioContext.resume().catch(() => {});
  return audioContext;
}

/**
 * A short synthesized tone (or sequence of tones) — no audio assets to
 * ship or license, keeps the whole cue set at effectively zero bundle cost.
 */
function playTone(frequencies: number[], durationMs: number, type: OscillatorType = "sine") {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const stepMs = durationMs / frequencies.length;
  frequencies.forEach((frequency, index) => {
    const startTime = ctx.currentTime + (index * stepMs) / 1000;
    const stopTime = startTime + stepMs / 1000;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(stopTime);
  });
}

function vibrate(pattern: number | number[]) {
  if (!enabled) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

export function playHintSound(): void {
  playTone([660, 880], 220, "triangle");
  vibrate(40);
}

export function playCorrectSound(): void {
  playTone([523, 659, 784], 300, "sine");
  vibrate([30, 40, 30]);
}

export function playIncorrectSound(): void {
  playTone([220, 165], 260, "sawtooth");
  vibrate(80);
}

export function playTickSound(): void {
  playTone([880], 80, "square");
  vibrate(15);
}
