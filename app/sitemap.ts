import type { MetadataRoute } from "next";

// No production domain is hardcoded here — set NEXT_PUBLIC_SITE_URL once a
// domain is chosen so these URLs point at the real deployment instead of
// localhost (see app/robots.ts).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Deliberately only the static, publicly-indexable routes. Room pages are
// private/session-bound (see robots.ts), and "my packs"/profile are
// per-player. Individual published community packs (/community/[packId])
// would be worth adding here too, but that needs a Supabase query at
// build/request time — left as a follow-up rather than guessed at here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/community`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
