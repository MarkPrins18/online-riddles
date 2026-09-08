import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/locales";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  nl: "NL",
};

/**
 * Same look as LanguageSwitcher, for pages under app/[locale] (see
 * i18n/routing.ts). Switching language here means navigating to this same
 * page under the other locale's URL prefix, not re-rendering with a new
 * cookie — a [locale]-segment page's language comes from the URL, not the
 * cookie, so a cookie flip alone wouldn't change anything here. Not shared
 * with LanguageSwitcher (used on /room, which stays outside [locale])
 * because the two need genuinely different navigation mechanics, not just
 * different markup. Server component: a real <a href> per locale needs no
 * client-side state or transition here, unlike the cookie-writing version.
 */
export async function LocalizedLanguageSwitcher({
  pathname,
  className = "",
}: {
  /** The current page's locale-agnostic pathname, e.g. "/community". */
  pathname: string;
  className?: string;
}) {
  const locale = await getLocale();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-text-secondary ${className}`}
    >
      {locales.map((option) =>
        option === locale ? (
          <span
            key={option}
            aria-current="true"
            className="rounded-sm bg-accent px-2 py-1 text-bg-primary"
          >
            {LOCALE_LABELS[option]}
          </span>
        ) : (
          <Link
            key={option}
            href={pathname}
            locale={option}
            className="rounded-sm px-2 py-1 transition-colors hover:text-accent"
          >
            {LOCALE_LABELS[option]}
          </Link>
        )
      )}
    </div>
  );
}
