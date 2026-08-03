import { HTMLAttributes } from "react";

type CardTone = "chrome" | "case" | "paper";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

const TONE_CLASSES: Record<CardTone, string> = {
  // Quiet, receding treatment for bookkeeping panels (scoreboard, chat,
  // lobby forms) — softer border, no shadow, so it doesn't compete with
  // case-tone panels for attention.
  chrome: "rounded border border-white/[0.04] bg-bg-secondary p-6",
  // Heavier treatment for panels about the mystery itself (dossier,
  // solution, guess panel) — a folder-brown surface with a plain drop
  // shadow, like a loose sheet set down rather than a glowing UI panel.
  case: "rounded-sm border border-black/40 bg-bg-case p-6 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)]",
  // Physical paper: ragged torn edge instead of a rounded corner, a faint
  // fiber texture instead of a flat fill — reserved for things that are
  // conceptually a single sheet (clue cards, hints, the ask-a-question
  // note), so it stays a recognizable, distinct object rather than a
  // reskinned UI card.
  paper:
    "torn-edge relative border-0 p-5 text-ink shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] " +
    "bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_0)] bg-[length:6px_6px] bg-paper",
};

export function Card({ tone = "chrome", className = "", ...props }: CardProps) {
  return <div className={`${TONE_CLASSES[tone]} ${className}`} {...props} />;
}
