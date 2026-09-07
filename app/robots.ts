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
      // Session-bound / private surfaces: a room code or "my packs" list
      // isn't meant to be indexed, and there's nothing for a crawler to
      // usefully see there anyway (client-rendered, per-player state).
      disallow: ["/api/", "/auth/", "/room/", "/profile", "/community/mijn"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
