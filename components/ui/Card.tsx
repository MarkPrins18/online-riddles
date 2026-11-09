import { HTMLAttributes } from "react";

type CardTone = "chrome" | "case" | "paper";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

const TONE_CLASSES: Record<CardTone, string> = {
  // Quiet, receding treatment for bookkeeping panels (scoreboard, chat,
  // lobby forms) — a flat dark surface so it doesn't compete with the
  // panels about the case itself.
  chrome: "rounded-xl border-2 border-border bg-bg-secondary p-6",
  // Panels about the mystery itself (dossier, forms that start a case):
  // cream outline with a hard yellow offset shadow, like a sticker on a
  // paperback cover — loud, but still a dark surface so any text color
  // that works on the page works here too.
  case: "rounded-xl border-2 border-text-primary bg-bg-secondary p-6 shadow-[5px_5px_0_var(--accent)]",
  // Cream paper with ink text — reserved for things that are conceptually
  // a single sheet (clue cards, hints, the ask-a-question note).
  paper: "rounded-xl border-[3px] border-ink bg-paper p-5 text-ink shadow-[5px_5px_0_var(--accent)]",
};

export function Card({ tone = "chrome", className = "", ...props }: CardProps) {
  return <div className={`${TONE_CLASSES[tone]} ${className}`} {...props} />;
}
