import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, localeCookieName } from "@/lib/i18n/locales";

// `requestLocale` comes from the [locale] URL segment when the current
// page is inside app/[locale] (see middleware.ts). For everything else —
// /room, /profile, /api, /auth — it resolves to undefined (per next-intl:
// "the value can be undefined when a page outside of the [locale] segment
// renders"), so those pages fall back to the same cookie read this always
// did before locale-prefixed routing existed.
export default getRequestConfig(async ({ requestLocale }) => {
  const segmentLocale = await requestLocale;
  if (isLocale(segmentLocale)) {
    return {
      locale: segmentLocale,
      messages: (await import(`../messages/${segmentLocale}.json`)).default,
    };
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
