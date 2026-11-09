import { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "accent" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

// Solid label, like a sticker on a paperback cover — fill carries the
// tone, text stays readable on it.
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-2 border-border text-text-secondary",
  accent: "border-2 border-accent bg-accent text-ink",
  danger: "border-2 border-danger bg-danger text-ink",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
