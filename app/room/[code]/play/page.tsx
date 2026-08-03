import { GamePlayClient } from "@/components/game/GamePlayClient";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6">
      <GamePlayClient code={code.toUpperCase()} />
    </main>
  );
}
