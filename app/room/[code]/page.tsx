import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RoomLobbyClient } from "@/components/lobby/RoomLobbyClient";

// Just a browser-tab-friendly title — the room code itself is already
// public/shareable (it's meant to be handed to friends to join), so there's
// no privacy concern including it here. No description: this route is
// already disallowed in robots.ts (private, ~24h-lived), so there's nothing
// for a crawler to ever read it.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const t = await getTranslations("Metadata");
  return { title: t("roomTitle", { code: code.toUpperCase() }) };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <RoomLobbyClient code={code.toUpperCase()} />
    </main>
  );
}
