import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileClient } from "@/components/profile/ProfileClient";

// Per-player, session-bound content — nothing here is meant to rank.
// `noindex` (rather than relying on robots.txt alone) is the correct tool:
// a robots.txt disallow only stops crawling, so a linked-to but disallowed
// URL can still get indexed with no visible content. This tag only works
// if the page stays crawlable, so it's no longer in robots.ts's disallow
// list either. Still gets a real title/description (not just noindex) for
// the browser tab, bookmarks, and link previews.
export async function generateMetadata(): Promise<Metadata> {
  const [tProfile, tMetadata] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Metadata"),
  ]);
  return {
    title: tProfile("statsTitle"),
    description: tMetadata("profileDescription"),
    robots: { index: false, follow: true },
  };
}

export default function ProfilePage() {
  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <ProfileClient />
    </main>
  );
}
