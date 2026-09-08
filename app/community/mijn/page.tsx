import type { Metadata } from "next";
import { CommunityMineClient } from "@/components/community/CommunityMineClient";

// Per-player content (the caller's own packs, published or not) — see
// app/profile/page.tsx for why this is `noindex` rather than only a
// robots.txt disallow.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CommunityMinePage() {
  return <CommunityMineClient />;
}
