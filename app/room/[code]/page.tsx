import { RoomLobbyClient } from "@/components/lobby/RoomLobbyClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <RoomLobbyClient code={code.toUpperCase()} />
    </main>
  );
}
