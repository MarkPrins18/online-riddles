"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AccountButton } from "@/components/account/AccountButton";

// "/" and "/community" need an exact match — startsWith would make both of
// them (mis)fire as active on every route, since every path starts with
// "/" and "/community/..." also starts with "/community".
const EXACT_MATCH_HREFS = new Set(["/", "/community"]);

/**
 * Shared across every /community/* route via app/community/layout.tsx —
 * without this each page only linked to a couple of its siblings ad hoc,
 * so there was no consistent way to get from e.g. a pack detail page back
 * to "mijn packs".
 */
export function CommunityNav() {
  const pathname = usePathname();
  const t = useTranslations("CommunityNav");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const LINKS = [
    { href: "/", label: t("play") },
    { href: "/community", label: t("communityPacks") },
    { href: "/community/mijn", label: t("myPacks") },
    { href: "/community/nieuw", label: t("submitRiddle") },
  ];

  const activeHref =
    LINKS.find((link) =>
      EXACT_MATCH_HREFS.has(link.href) ? pathname === link.href : pathname.startsWith(link.href)
    )?.href ?? LINKS[0].href;
  const activeLabel = LINKS.find((link) => link.href === activeHref)?.label;

  // Same click-outside/Escape pattern as ChatReactionPicker — this is a
  // real dropdown menu (not the OS's own <select> picker), so it needs to
  // manage its own open state and closing.
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-3 sm:gap-0 sm:pb-0">
      {/* Four tab labels plus the account trigger don't fit a phone
          screen — a dropdown keeps every destination equally reachable
          with one tap, instead of some of them requiring a horizontal
          scroll a visitor might never discover. sm and up switch to the
          tab-shaped links (hidden below sm, this trigger is hidden at sm
          and up) since there's room for them there. */}
      <div className="relative min-w-0 flex-1 sm:hidden" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex w-full items-center justify-between gap-2 rounded-sm border border-accent/40 bg-bg-secondary px-3 py-2.5 font-mono text-sm text-accent transition-colors"
        >
          <span>{activeLabel}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 8"
            className={`h-2 w-3 shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          >
            <path
              d="M1 1l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-bg-secondary p-1 shadow-lg"
          >
            {LINKS.map((link) => {
              const isActive = link.href === activeHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-md px-3 py-2 font-mono text-sm transition-colors ${
                    isActive
                      ? "bg-bg-primary text-accent"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <nav className="hidden min-w-0 gap-1 overflow-x-auto sm:flex">
        {LINKS.map((link) => {
          const isActive = link.href === activeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`tab-shape shrink-0 border border-b-0 px-3 pb-2 pt-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                isActive
                  ? "border-accent/40 bg-bg-secondary text-accent"
                  : "border-white/10 bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <AccountButton />
    </div>
  );
}
