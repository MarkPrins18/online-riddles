"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useDialog } from "@/lib/a11y/useDialog";

/**
 * Slide-in sibling to Modal: same escape-key/backdrop-close contract, but
 * docked to the right edge instead of covering the viewport, so it can sit
 * alongside the desk rather than blocking it. Only the topmost overlay
 * should close on Escape — each instance checks it's still the latest
 * mounted Drawer before acting, since a Drawer and the Corkboard Modal can
 * be open at the same time.
 */
export function Drawer({
  onClose,
  title,
  children,
  className = "",
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [entered, setEntered] = useState(false);
  const dialogRef = useDialog<HTMLDivElement>();
  const titleId = useId();
  const t = useTranslations("Common");

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const closedRef = useRef(false);
  function close() {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px] transition-opacity duration-200"
      style={{ opacity: entered ? 1 : 0 }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-bg-secondary shadow-2xl shadow-black/60 transition-transform duration-200 ease-out ${className}`}
        style={{ transform: entered ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p
            id={titleId}
            className="relative font-mono text-xs uppercase tracking-widest text-text-secondary before:absolute before:-left-2 before:-top-2 before:h-3 before:w-8 before:-rotate-3 before:bg-accent/25 before:content-['']"
          >
            <span className="relative">{title}</span>
          </p>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
