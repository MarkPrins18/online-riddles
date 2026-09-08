import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommunityMineClient } from "@/components/community/CommunityMineClient";
import { isLocale } from "@/lib/i18n/locales";

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

export default async function CommunityMinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  return <CommunityMineClient />;
}
