"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import type { RoomSettingsInput } from "@/types/room";
import { getRandomPuzzle } from "@/lib/supabase/puzzles";
import { setNarrator } from "@/lib/supabase/players";
import { setRoomPuzzle, updateRoomSettings } from "@/lib/supabase/rooms";
import { assignSaboteur } from "@/lib/supabase/roundSecrets";
import { resolveNarrator, canAssignSaboteur, pickSaboteur, type NarratorSelection } from "@/lib/game/roles";
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
  locale,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  roomCode: string;
  players: Player[];
  narratorSelection: NarratorSelection;
  playedPuzzleIds: string[];
  roomSettings: RoomSettingsInput;
  locale: string;
}) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("StartGameButton");

  const hasCommunitySelection =
    roomSettings.communityPackIds === null || roomSettings.communityPackIds.length > 0;
  const settingsIncomplete = roomSettings.packThemeFilter.length === 0 && !hasCommunitySelection;

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
        locale,
        playedPuzzleIds,
        roomSettings.packThemeFilter,
        roomSettings.communityPackIds,
        targetDifficultyForRound(0, roomSettings.maxRounds)
      );
      await setNarrator(supabase, roomId, narrator.id);
      await setRoomPuzzle(supabase, roomId, puzzle.id, playedPuzzleIds);

      if (roomSettings.saboteurMode && canAssignSaboteur(players)) {
        const saboteur = pickSaboteur(players, narrator.id);
        if (saboteur) {
          await assignSaboteur(supabase, { roomId, round: 0, saboteurId: saboteur.id });
        }
      }

      router.push(`/room/${roomCode}/play`);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
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
          ? t("starting")
          : players.length < 2
            ? t("waitingForPlayers")
            : settingsIncomplete
              ? t("chooseThemeOrPack")
              : t("start")}
      </Button>
    </div>
  );
}
