"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import type { RoomSettingsInput } from "@/types/room";
import { getRandomPuzzle } from "@/lib/supabase/puzzles";
import { setNarrator } from "@/lib/supabase/players";
import { setRoomPuzzle, updateRoomSettings } from "@/lib/supabase/rooms";
import { resolveNarrator, type NarratorSelection } from "@/lib/game/roles";
import { targetDifficultyForRound } from "@/lib/game/difficulty";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

export function StartGameButton({
  supabase,
  roomId,
  roomCode,
  players,
  narratorSelection,
  playedPuzzleIds,
  roomSettings,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  roomCode: string;
  players: Player[];
  narratorSelection: NarratorSelection;
  playedPuzzleIds: string[];
  roomSettings: RoomSettingsInput;
}) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsIncomplete = roomSettings.packThemeFilter.length === 0;

  async function handleStart() {
    setIsStarting(true);
    setError(null);

    const narrator = resolveNarrator(narratorSelection, players, null);
    if (!narrator) {
      setIsStarting(false);
      return;
    }

    try {
      await updateRoomSettings(supabase, roomId, roomSettings);
      const puzzle = await getRandomPuzzle(
        supabase,
        playedPuzzleIds,
        roomSettings.packThemeFilter,
        targetDifficultyForRound(0, roomSettings.maxRounds)
      );
      await setNarrator(supabase, roomId, narrator.id);
      await setRoomPuzzle(supabase, roomId, puzzle.id, playedPuzzleIds);
      router.push(`/room/${roomCode}/play`);
    } catch (err) {
      setError(getErrorMessage(err, "Kon het spel niet starten. Probeer het opnieuw."));
      setIsStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button
        onClick={handleStart}
        disabled={isStarting || players.length < 2 || settingsIncomplete}
      >
        {isStarting
          ? "Zaak wordt geopend..."
          : players.length < 2
            ? "Wacht op meer spelers..."
            : settingsIncomplete
              ? "Kies minstens één thema..."
              : "Start het spel"}
      </Button>
    </div>
  );
}
