"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useGameState } from "@/lib/game/useGameState";
import { getStoredPlayerId } from "@/lib/session";
import { resolveNarrator, type NarratorSelection } from "@/lib/game/roles";
import type { RoomSettingsInput } from "@/types/room";
import { createKickHandler } from "@/lib/game/membership";
import { Card } from "@/components/ui/Card";
import { HowToPlayButton } from "@/components/HowToPlayButton";
import { ClaimHostBanner } from "@/components/ClaimHostBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RoomCodeDisplay } from "./RoomCodeDisplay";
import { PlayerList } from "./PlayerList";
import { JoinRoomForm } from "./JoinRoomForm";
import { StartGameButton } from "./StartGameButton";
import { NarratorPicker } from "./NarratorPicker";
import { RoomSettingsForm } from "./RoomSettingsForm";
import { LeaveRoomButton } from "./LeaveRoomButton";

const CARD_TITLE_CLASS = "mb-3 font-mono text-xs uppercase tracking-widest text-text-secondary";

export function RoomLobbyClient({ code }: { code: string }) {
  const [playerId, setPlayerId] = useState(() => getStoredPlayerId(code));
  const locale = useLocale();
  const { state, supabase } = useGameState(code, playerId, locale);
  const router = useRouter();
  const [narratorSelection, setNarratorSelection] = useState<NarratorSelection>({
    mode: "auto",
  });
  const [roomSettings, setRoomSettings] = useState<RoomSettingsInput>({
    roundDurationSeconds: 600,
    maxRounds: 5,
    packThemeFilter: [],
    communityPackIds: null,
    hardcoreMode: false,
    teamLives: 5,
    saboteurMode: false,
  });
  const t = useTranslations("RoomLobbyClient");

  useEffect(() => {
    if (state.room?.status === "playing" || state.room?.status === "revealed") {
      router.push(`/room/${code}/play`);
    }
  }, [state.room?.status, code, router]);

  if (state.error) {
    return (
      <p className="font-mono text-sm text-danger">
        {t("errorPrefix", { error: state.error })}
      </p>
    );
  }

  if (!state.room) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("loadingRoom")}</p>
    );
  }

  const isHost = playerId === state.room.host_id;
  const narratorPreview = resolveNarrator(narratorSelection, state.players, null);

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <RoomCodeDisplay code={state.room.code} />
      <HowToPlayButton className="self-center" />

      <ClaimHostBanner
        supabase={supabase}
        roomId={state.room.id}
        players={state.players}
        hostId={state.room.host_id}
        onlinePlayerIds={state.onlinePlayerIds}
        playerId={playerId}
      />

      <Card>
        <p className={CARD_TITLE_CLASS}>
          {t("playersHeading", { count: state.players.length })}
        </p>
        <PlayerList
          players={state.players}
          onKick={isHost ? createKickHandler(supabase, state.players) : undefined}
          onlinePlayerIds={state.onlinePlayerIds}
        />
      </Card>

      {playerId ? (
        isHost ? (
          <>
            <Card>
              <RoomSettingsForm
                supabase={supabase}
                value={roomSettings}
                onChange={setRoomSettings}
                narratorPreviewName={narratorPreview?.name}
                playerCount={state.players.length}
              />
            </Card>
            <Card>
              <NarratorPicker
                players={state.players}
                selection={narratorSelection}
                onChange={setNarratorSelection}
              />
            </Card>
            <StartGameButton
              supabase={supabase}
              roomId={state.room.id}
              roomCode={state.room.code}
              players={state.players}
              narratorSelection={narratorSelection}
              playedPuzzleIds={state.room.played_puzzle_ids}
              roomSettings={roomSettings}
              locale={locale}
            />
          </>
        ) : (
          <p className="text-center font-mono text-sm text-text-secondary">
            {t("waitingForHost")}
          </p>
        )
      ) : (
        <Card>
          <p className={CARD_TITLE_CLASS}>
            {t("joinHeading")}
          </p>
          <JoinRoomForm presetCode={code} onJoined={setPlayerId} />
        </Card>
      )}

      {playerId && (
        <LeaveRoomButton
          supabase={supabase}
          roomId={state.room.id}
          roomCode={state.room.code}
          players={state.players}
          playerId={playerId}
        />
      )}
    </div>
  );
}
