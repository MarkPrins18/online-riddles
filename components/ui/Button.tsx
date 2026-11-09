import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "tab";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  // Compact square sizing for icon-free chrome (e.g. the drawer close ✕).
  iconOnly?: boolean;
};

// Primary/danger/secondary are the loud paperback-cover buttons (Anton,
// uppercase); ghost and tab are quiet text controls in the body face.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "rounded-lg border-2 border-accent bg-accent font-display uppercase tracking-wide text-ink hover:border-accent-muted hover:bg-accent-muted disabled:hover:border-accent disabled:hover:bg-accent",
  secondary:
    "rounded-lg border-2 border-text-primary bg-transparent font-display uppercase tracking-wide text-text-primary hover:bg-text-primary hover:text-ink",
  ghost: "rounded-lg bg-transparent font-bold text-text-secondary hover:text-text-primary",
  danger:
    "rounded-lg border-2 border-danger bg-danger font-display uppercase tracking-wide text-ink hover:brightness-110",
  // Trigger for on-demand drawers (Spelers/Verhoor) — a labelled pill,
  // never an emoji glyph standing in for the meaning.
  tab: "rounded-full border-2 border-border bg-bg-secondary font-bold text-text-secondary hover:border-accent hover:text-accent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", iconOnly = false, className = "", ...props }, ref) {
    const sizeClasses = iconOnly ? "p-2.5" : variant === "tab" ? "px-4 py-2" : "px-4 py-2.5";
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 text-base transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  }
);
