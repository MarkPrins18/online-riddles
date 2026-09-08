import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CommunityBrowseClient } from "@/components/community/CommunityBrowseClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const title = t("communityTitle");
  const description = t("communityDescription");

  return {
    title,
    description,
    alternates: { canonical: "/community" },
    openGraph: { title, description, type: "website" },
    twitter: { title, description },
  };
}

export default function CommunityPage() {
  return <CommunityBrowseClient />;
}
