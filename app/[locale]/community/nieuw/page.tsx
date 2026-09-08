import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommunityNewClient } from "@/components/community/CommunityNewClient";
import { isLocale } from "@/lib/i18n/locales";

// A submission form, not content worth ranking — see app/profile/page.tsx
// for why this is `noindex` rather than a robots.txt disallow, and for a
// real title/description alongside it.
export async function generateMetadata(): Promise<Metadata> {
  const [tNew, tMetadata] = await Promise.all([
    getTranslations("CommunityNewClient"),
    getTranslations("Metadata"),
  ]);
  return {
    title: tNew("heading"),
    description: tMetadata("submitRiddleDescription"),
    robots: { index: false, follow: true },
  };
}

export default async function CommunityNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  return (
    <div className="max-w-2xl">
      <CommunityNewClient />
    </div>
  );
}
