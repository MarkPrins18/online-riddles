import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GamePlayClient } from "@/components/game/GamePlayClient";

// See app/room/[code]/page.tsx for why this only sets a title.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const t = await getTranslations("Metadata");
  return { title: t("roomPlayTitle", { code: code.toUpperCase() }) };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center px-4 pt-4 pb-10 sm:px-6 sm:pt-10">
      <GamePlayClient code={code.toUpperCase()} />
    </main>
  );
}
