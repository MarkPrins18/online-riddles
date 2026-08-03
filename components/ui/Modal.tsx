"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export function Modal({
  onClose,
  children,
  className = "",
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary/95 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col rounded-lg border border-white/5 bg-bg-secondary ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
