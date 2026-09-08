import type { MetadataRoute } from "next";

// No production domain is hardcoded here (see AGENTS.md scale/portability
// guidance) — set NEXT_PUBLIC_SITE_URL once a domain is chosen so the
// `Sitemap:` line below points at the real deployment instead of localhost.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Non-page routes only — nothing here is HTML a crawler could ever
      // usefully render. Per-player pages (/profile, /community/mijn,
      // /community/nieuw) are deliberately *not* disallowed here: a
      // robots.txt disallow only blocks crawling, so a URL linked to from
      // elsewhere could still get indexed with no visible content. Those
      // pages instead carry their own `noindex` (see their metadata),
      // which only works if Google is actually allowed to crawl and see
      // it. /room/ stays disallowed rather than noindex'd — it's dynamic,
      // ephemeral (rooms are deleted ~24h after creation), and never meant
      // to be a landing page, so there's no meta tag worth maintaining
      // across every room route.
      disallow: ["/api/", "/auth/", "/room/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
