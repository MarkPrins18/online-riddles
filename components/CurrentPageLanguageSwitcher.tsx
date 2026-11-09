"use client";

import { useLocale } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/locales";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  nl: "NL",
};

/**
 * Client twin of LocalizedLanguageSwitcher for shared [locale] layouts
 * (e.g. /community/*), which don't know which sub-page they wrap: reads
 * the current locale-agnostic path itself and links to the same page under
 * the other locale. A plain <a> on purpose — a language switch needs a full
 * reload (see LocalizedLanguageSwitcher for why).
 */
export function CurrentPageLanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <span className="inline-flex items-center gap-3">
      {locales
        .filter((option) => option !== locale)
        .map((option) => (
          <a
            key={option}
            href={getPathname({ href: pathname, locale: option })}
            hrefLang={option}
            lang={option}
            className="text-[15px] font-bold text-text-secondary transition-colors hover:text-accent"
          >
            {LOCALE_LABELS[option]}
          </a>
        ))}
    </span>
  );
}
