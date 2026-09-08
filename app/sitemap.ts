import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/publicClient";

// No production domain is hardcoded here — set NEXT_PUBLIC_SITE_URL once a
// domain is chosen so these URLs point at the real deployment instead of
// localhost (see app/robots.ts).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Well under Google's 50,000-URL-per-sitemap limit — a single sitemap.ts
// (no sharding via generateSitemaps) is enough for that. If the published
// community pack count ever approaches this, split by generateSitemaps
// (see the Next.js docs) — but that also needs robots.ts's `sitemap` field
// to enumerate the resulting /sitemap/<n>.xml files instead of one static
// path, so don't add the sharding half without the other.
const MAX_PACK_URLS = 20000;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: siteUrl, changeFrequency: "weekly", priority: 1 },
  { url: `${siteUrl}/community`, changeFrequency: "daily", priority: 0.8 },
  { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A transient Supabase error shouldn't take down the whole sitemap (or,
  // since this route prerenders at build time, the whole build) — degrade
  // to the static routes instead of failing the request.
  let packUrls: MetadataRoute.Sitemap = [];
  try {
    const supabase = createPublicClient();
    // Published community packs only — same set list_community_packs_newest
    // (schema.sql) surfaces on /community, so this never links a page a
    // visitor can't actually reach from there. Room pages are private/
    // session-bound (see robots.ts), and "my packs"/profile are per-player.
    const { data: packs, error } = await supabase
      .from("story_packs")
      .select("id, created_at")
      .eq("is_community", true)
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .range(0, MAX_PACK_URLS - 1);
    if (error) throw error;

    packUrls = (packs ?? []).map((pack) => ({
      url: `${siteUrl}/community/${pack.id}`,
      lastModified: pack.created_at,
      changeFrequency: "monthly",
      priority: 0.5,
    }));
  } catch (error) {
    console.error("sitemap: failed to load community packs", error);
  }

  return [...STATIC_ROUTES, ...packUrls];
}
