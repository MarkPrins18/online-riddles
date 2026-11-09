"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HowToPlayButton } from "@/components/HowToPlayButton";

/**
 * The one header every page shares: wordmark plus plain nav links. The
 * language link is passed in because it works differently per route —
 * pages under [locale] switch by URL prefix, /room and /profile by cookie.
 */
export function SiteHeader({ languageSwitcher }: { languageSwitcher?: ReactNode }) {
  const t = useTranslations("SiteHeader");

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-[22px]">
      <Link href="/" className="font-display text-[28px] uppercase tracking-[0.02em] text-text-primary">
        Detective<span className="text-accent">Nights</span>
      </Link>
      <nav className="flex flex-wrap items-center gap-x-[22px] gap-y-2 text-[15px] font-bold">
        <Link href="/community" className="text-text-primary hover:text-accent">
          {t("riddles")}
        </Link>
        <HowToPlayButton variant="plain" />
        {/* /profile lives outside [locale], so a plain link — the locale-aware
            Link would send it to a non-existent /nl/profile. */}
        <NextLink href="/profile" className="text-text-primary hover:text-accent">
          {t("stats")}
        </NextLink>
        {languageSwitcher}
      </nav>
    </header>
  );
}
