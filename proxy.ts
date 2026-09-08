// Next 16 renamed the "middleware" file convention to "proxy" (same
// mechanism, see AGENTS.md's warning to check current conventions before
// writing code) — this is next-intl's locale-routing proxy, unrelated to
// data proxying.
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Only the routes actually served from app/[locale] should ever be
  // rewritten/redirected for a locale prefix. Everything else is
  // explicitly excluded so this never touches a route that doesn't exist
  // under a /nl prefix: /api and /auth (not pages at all), /room and
  // /profile (deliberately kept unprefixed — see i18n/routing.ts and the
  // "Known functionality gaps" entry in CLAUDE.md for why), /icons and
  // /opengraph-image (generated image routes with no file extension in
  // their URL, so the trailing "contains a dot" exclusion below wouldn't
  // otherwise catch them), plus Next's own internals and any request for
  // a literal file (robots.txt, sitemap.xml, manifest.webmanifest, ...).
  matcher: [
    "/((?!api|auth|room|profile|icons|opengraph-image|_next|_vercel|.*\\..*).*)",
  ],
};
