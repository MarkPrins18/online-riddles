import type { Metadata } from "next";
import { CommunityNewClient } from "@/components/community/CommunityNewClient";

// A submission form, not content worth ranking — see app/profile/page.tsx
// for why this is `noindex` rather than a robots.txt disallow.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CommunityNewPage() {
  return (
    <div className="max-w-2xl">
      <CommunityNewClient />
    </div>
  );
}
