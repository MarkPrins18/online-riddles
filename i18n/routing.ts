import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales, localeCookieName } from "@/lib/i18n/locales";

// Only the pages that are actually indexable (see app/[locale]) get a
// locale-prefixed URL — everything else (room/profile/api/auth) stays
// outside this segment entirely, see middleware.ts's matcher. `as-needed`
// keeps the default locale (English) unprefixed, so most URLs don't
// change; Dutch gets an explicit /nl prefix.
//
// `localeCookie` is set to the exact same name/attributes as the existing
// cookie lib/i18n/actions.ts's setLocale writes for pages outside the
// [locale] segment — same cookie, read by both mechanisms, so a language
// choice made on either side of the app is respected everywhere else.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: { mode: "as-needed" },
  localeCookie: {
    name: localeCookieName,
    sameSite: "lax",
    path: "/",
  },
  // Without this, the proxy auto-redirects any unprefixed request back to
  // whatever locale the cookie last recorded — so once a visitor had been
  // on /nl even once, clicking "EN" (a plain navigation to "/") bounced
  // straight back to /nl, because the cookie still said "nl". That made
  // the switcher look broken/stuck on Dutch. The cookie itself is still
  // written (localeCookie above) and still read manually by
  // i18n/request.ts for pages outside [locale] (/room, /profile) — this
  // only stops the proxy from using it to override an explicit URL.
  localeDetection: false,
});
