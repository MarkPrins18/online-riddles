import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CommunityMineClient } from "@/components/community/CommunityMineClient";

// Per-player content (the caller's own packs, published or not) — see
// app/profile/page.tsx for why this is `noindex` rather than only a
// robots.txt disallow, and for a real title/description alongside it.
export async function generateMetadata(): Promise<Metadata> {
  const [tMine, tMetadata] = await Promise.all([
    getTranslations("CommunityMineClient"),
    getTranslations("Metadata"),
  ]);
  return {
    title: tMine("heading"),
    description: tMetadata("myPacksDescription"),
    robots: { index: false, follow: true },
  };
}

export default function CommunityMinePage() {
  return <CommunityMineClient />;
}
