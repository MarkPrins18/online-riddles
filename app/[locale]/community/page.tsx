import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommunityBrowseClient } from "@/components/community/CommunityBrowseClient";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Metadata");
  const title = t("communityTitle");
  const description = t("communityDescription");

  return {
    title,
    description,
    alternates: { canonical: locale === "nl" ? "/nl/community" : "/community" },
    openGraph: { title, description, type: "website" },
    twitter: { title, description },
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  return <CommunityBrowseClient />;
}
