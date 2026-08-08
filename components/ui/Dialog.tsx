"use client";

import type { ReactNode } from "react";
import { useDialog } from "@/lib/a11y/useDialog";

/**
 * Centered overlay for a moment that deserves ceremony — the game (or
 * session) actually ending — rather than another bordered box stacked into
 * the normal flow. No backdrop-click-to-close: the content itself carries
 * the only way forward (host's "volgende zaak"/"nieuw spel" buttons).
 */
export function Dialog({ children, className = "" }: { children: ReactNode; className?: string }) {
  const dialogRef = useDialog<HTMLDivElement>();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-6 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`my-auto w-full max-w-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
