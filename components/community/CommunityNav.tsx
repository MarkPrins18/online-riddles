"use client";

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

  const LINKS = [
    { href: "/", label: t("play") },
    { href: "/community", label: t("communityPacks") },
    { href: "/community/mijn", label: t("myPacks") },
    { href: "/community/nieuw", label: t("submitRiddle") },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-white/10">
      {/* min-w-0 lets this shrink below its content width so it's the one
          that scrolls (not the whole page) when the tabs + AccountButton
          don't all fit — four tab labels plus an account trigger routinely
          don't, on a phone-width screen. */}
      <nav className="flex min-w-0 gap-1 overflow-x-auto">
        {LINKS.map((link) => {
          const isActive = EXACT_MATCH_HREFS.has(link.href)
            ? pathname === link.href
            : pathname.startsWith(link.href);
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
