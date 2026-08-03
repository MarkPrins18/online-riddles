import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "tab";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  // Compact square sizing for icon-free chrome (e.g. the drawer close ✕).
  iconOnly?: boolean;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "rounded-sm bg-accent text-bg-primary hover:bg-accent-muted disabled:bg-accent-muted/50",
  secondary:
    "rounded-sm bg-bg-secondary text-text-primary border border-white/10 hover:border-accent-muted",
  ghost: "rounded-sm bg-transparent text-text-secondary hover:text-text-primary",
  danger: "rounded-sm bg-danger text-text-primary hover:brightness-110",
  // A manila-folder tab, not an icon button — the trigger for on-demand
  // drawers (Spelers/Verhoor). Meaning comes from the label, never an
  // emoji glyph standing in for it.
  tab: "tab-shape bg-bg-secondary text-text-secondary border border-white/10 border-b-0 hover:text-accent hover:border-accent/40",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", iconOnly = false, className = "", ...props }, ref) {
    const sizeClasses = iconOnly ? "p-2.5" : variant === "tab" ? "px-4 pb-2 pt-2.5" : "px-4 py-2.5";
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 font-mono text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  }
);
