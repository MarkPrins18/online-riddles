import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { routing } from "@/i18n/routing";

// Lets Next statically prerender each locale of the pages in this segment
// (see routing.locales) instead of always rendering them on demand.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // An invalid segment (e.g. a stray /xx/community request) still reaches
  // this far because [locale] is effectively a catch-all for the first
  // path segment — i18n/request.ts already falls back safely, but bail out
  // of static rendering rather than pretend an unknown locale is real.
  if (isLocale(locale)) setRequestLocale(locale);

  // No visual wrapper here — app/layout.tsx already provides <html>,
  // NextIntlClientProvider, the footer, etc. for every route, prefixed or
  // not.
  return children;
}
