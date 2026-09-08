import { cache } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommunityPackDetailClient } from "@/components/community/CommunityPackDetailClient";
import { createPublicClient } from "@/lib/supabase/publicClient";
import { getOwnPack } from "@/lib/supabase/communityPacks";
import { listPuzzlesForPack } from "@/lib/supabase/communityPuzzles";
import { isLocale } from "@/lib/i18n/locales";

// Anon-key read, same rows a crawler (or any anonymous visitor) can see —
// RLS only returns a pack here when it's published, so a null result means
// "not published (or doesn't exist)" from a crawler's point of view, even
// if the pack's own creator would see it via their session in the client
// component below. Wrapped in `cache()` so generateMetadata and the page
// body share one fetch instead of two.
const getPublicPackData = cache(async (packId: string, locale: string) => {
  const supabase = createPublicClient();
  const pack = await getOwnPack(supabase, packId, locale).catch(() => null);
  if (!pack) return { pack: null, puzzles: [] };
  const puzzles = await listPuzzlesForPack(supabase, packId, locale).catch(() => []);
  return { pack, puzzles };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; packId: string }>;
}): Promise<Metadata> {
  const { locale, packId } = await params;
  const t = await getTranslations("Metadata");
  const { pack, puzzles } = await getPublicPackData(packId, locale);

  if (!pack) {
    return { title: t("packNotFoundTitle") };
  }

  const title = pack.name;
  const description = t("packDescription", {
    packName: pack.name,
    theme: pack.theme,
    count: puzzles.length,
  });
  const path = `/community/${packId}`;

  return {
    title,
    description,
    alternates: { canonical: locale === "nl" ? `/nl${path}` : path },
    openGraph: { title, description, type: "article" },
    twitter: { title, description },
  };
}

export default async function CommunityPackPage({
  params,
}: {
  params: Promise<{ locale: string; packId: string }>;
}) {
  const { locale, packId } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  const { pack, puzzles } = await getPublicPackData(packId, locale);

  const jsonLd = pack
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: pack.name,
        description: `${pack.theme} riddle pack for DetectiveNights`,
        numberOfItems: puzzles.length,
        itemListElement: puzzles.map((puzzle, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: puzzle.title,
          description: puzzle.scenario,
        })),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <CommunityPackDetailClient packId={packId} />
    </>
  );
}
