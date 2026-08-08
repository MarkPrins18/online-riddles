import { GamePlayClient } from "@/components/game/GamePlayClient";

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
