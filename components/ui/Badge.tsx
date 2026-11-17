import { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "accent" | "fact" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

// Follows the color roles in globals.css: "accent" is an emphasized piece
// of information (cream outline — yellow is reserved for actions), "fact"
// is something confirmed (cream fill), "danger" is no/wrong (red fill).
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-2 border-border text-text-secondary",
  accent: "border-2 border-text-primary text-text-primary",
  fact: "border-2 border-paper bg-paper text-ink",
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
