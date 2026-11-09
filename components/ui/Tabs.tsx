"use client";

import { useState, type ReactNode } from "react";

export type TabDef = {
  key: string;
  label: string;
  /** Shown as a small count chip next to the label — omit for no chip. */
  badge?: number;
  content: ReactNode;
};

/**
 * A tab bar plus the active pane's content. The pane fills whatever height
 * the caller's container gives it (`h-full` + `flex-1 min-h-0` on the pane
 * wrapper) — when that container has a definite height (e.g. "main"'s grid
 * row on mobile, sized to fill leftover space), the active pane grows to
 * match it instead of shrink-wrapping to its own content, so a short chat
 * still gets the full available box instead of a tiny one. Where the
 * container has no definite height (e.g. the "vast" column's Stel-een-vraag/
 * Los-de-zaak-op tabs), `h-full` is a no-op and this just behaves as a
 * normal block — safe either way.
 */
export function Tabs({
  tabs,
  defaultTab,
  onTabChange,
  trailing,
}: {
  tabs: TabDef[];
  defaultTab?: string;
  onTabChange?: (key: string) => void;
  /** Rendered at the end of the tab bar itself (e.g. a shortcut button) —
   * for callers that would otherwise need a whole extra row above the tabs
   * just to fit one button. */
  trailing?: ReactNode;
}) {
  const [activeKey, setActiveKey] = useState(defaultTab ?? tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 gap-1 border-b-2 border-border bg-bg-primary/95 backdrop-blur-sm">
        {tabs.map((tab) => {
          const isActive = tab.key === active?.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveKey(tab.key);
                onTabChange?.(tab.key);
              }}
              aria-pressed={isActive}
              className={`-mb-0.5 flex items-center gap-1.5 border-b-[3px] px-2.5 pb-2 pt-2 font-display text-base uppercase tracking-wide transition-colors sm:px-3 ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span
                  className={`inline-flex min-w-[1.25rem] justify-center rounded-full px-1 font-sans text-[11px] font-extrabold ${
                    isActive ? "bg-accent text-ink" : "bg-border text-text-primary"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
        {trailing && <div className="ml-auto flex items-center pb-1.5 sm:pb-2">{trailing}</div>}
      </div>
      <div className="min-h-0 flex-1 pb-1 pt-3">{active?.content}</div>
    </div>
  );
}
