import { HTMLAttributes } from "react";

type SectionLabelTone = "muted" | "hero";

type SectionLabelProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: SectionLabelTone;
};

const TONE_CLASSES: Record<SectionLabelTone, string> = {
  muted: "text-text-primary",
  hero: "text-accent",
};

export function SectionLabel({ tone = "muted", className = "", ...props }: SectionLabelProps) {
  return (
    <p
      className={`font-display text-lg uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
