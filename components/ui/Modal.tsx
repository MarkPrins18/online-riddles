"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useDialog } from "@/lib/a11y/useDialog";

export function Modal({
  onClose,
  children,
  className = "",
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useDialog<HTMLDivElement>();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      // Typography is reset here: a modal is rendered wherever its trigger
      // lives (e.g. inside a bold nav), and would otherwise inherit that
      // styling — bold body text and a faux-bold, smeared Anton heading.
      // No backdrop blur either: it can soften all text inside on Windows.
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary/95 p-4 text-left text-base font-normal normal-case tracking-normal text-text-primary"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`flex min-h-0 flex-1 flex-col rounded-lg border border-[#3a3a3a] bg-bg-secondary ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
