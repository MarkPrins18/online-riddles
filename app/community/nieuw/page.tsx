import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CommunityNewClient } from "@/components/community/CommunityNewClient";

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

export default function CommunityNewPage() {
  return (
    <div className="max-w-2xl">
      <CommunityNewClient />
    </div>
  );
}
