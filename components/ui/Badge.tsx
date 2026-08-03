import { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "accent" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

// Hand-stamped ink mark rather than a UI pill: irregular corner radii (no
// two the same), a slight rotation, and a colored border standing in for
// ink — no fill, no drop shadow.
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-text-secondary/50 text-text-secondary",
  accent: "border-accent/70 text-accent",
  danger: "border-danger/70 text-danger",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex -rotate-2 items-center rounded-[2px_8px_2px_8px] border-2 px-2 py-0.5 font-mono text-xs uppercase tracking-widest ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
