"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const t = useTranslations("CommunityNav");

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

  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-3 sm:gap-0 sm:pb-0">
      {/* Four tab labels plus the account trigger don't fit a phone
          screen — a dropdown keeps every destination equally reachable
          with one tap, instead of some of them requiring a horizontal
          scroll a visitor might never discover. sm and up switch to the
          tab-shaped links (hidden below sm, this select is hidden at sm
          and up) since there's room for them there. */}
      <select
        value={activeHref}
        onChange={(e) => router.push(e.target.value)}
        aria-label={t("navigateLabel")}
        className="min-w-0 flex-1 rounded-md border border-white/10 bg-bg-primary px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-muted sm:hidden"
      >
        {LINKS.map((link) => (
          <option key={link.href} value={link.href}>
            {link.label}
          </option>
        ))}
      </select>

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
