"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useGameState } from "@/lib/game/useGameState";
import { getStoredPlayerId } from "@/lib/session";
import type { NarratorSelection } from "@/lib/game/roles";
import type { RoomSettingsInput } from "@/types/room";
import { createKickHandler } from "@/lib/game/membership";
import { Card } from "@/components/ui/Card";
import { ClaimHostBanner } from "@/components/ClaimHostBanner";
import { RoomCodeDisplay } from "./RoomCodeDisplay";
import { PlayerList } from "./PlayerList";
import { JoinRoomForm } from "./JoinRoomForm";
import { StartGameButton } from "./StartGameButton";
import { NarratorPicker } from "./NarratorPicker";
import { RoomSettingsForm } from "./RoomSettingsForm";
import { LeaveRoomButton } from "./LeaveRoomButton";

const CARD_TITLE_CLASS = "mb-3 font-display text-xl uppercase text-accent";

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
      <p className="text-sm text-danger">
        {t("errorPrefix", { error: state.error })}
      </p>
    );
  }

  if (!state.room) {
    return (
      <p className="text-sm text-text-secondary">{t("loadingRoom")}</p>
    );
  }

  const isHost = playerId === state.room.host_id;

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Paperback cover: the room code is the one thing to hand out here. */}
      <section className="relative flex min-w-0 flex-[1_1_420px] flex-col gap-6 overflow-hidden rounded-md bg-accent px-6 py-8 text-ink sm:px-10 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-[340px] w-[340px] rounded-full bg-[radial-gradient(var(--ink)_2.2px,transparent_2.6px)] bg-[length:12px_12px] opacity-[0.18]"
        />
        <div className="relative">
          <h1 className="font-display text-5xl uppercase leading-[0.95] sm:text-6xl">{t("coverTitle")}</h1>
          <p className="mt-3 max-w-[28em] text-lg font-medium">{t("coverBody")}</p>
        </div>
        <div className="relative">
          <RoomCodeDisplay code={state.room.code} />
        </div>
      </section>

      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
        <ClaimHostBanner
          supabase={supabase}
          roomId={state.room.id}
          players={state.players}
          hostId={state.room.host_id}
          onlinePlayerIds={state.onlinePlayerIds}
          playerId={playerId}
        />

        <Card>
          <h2 className={CARD_TITLE_CLASS}>
            {t("playersHeading", { count: state.players.length })}
          </h2>
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
                <NarratorPicker
                  players={state.players}
                  selection={narratorSelection}
                  onChange={setNarratorSelection}
                />
              </Card>
              <Card>
                <RoomSettingsForm
                  supabase={supabase}
                  value={roomSettings}
                  onChange={setRoomSettings}
                  playerCount={state.players.length}
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
            <Card>
              <p className="text-base font-bold text-text-primary">{t("waitingForHost")}</p>
            </Card>
          )
        ) : (
          <Card>
            <h2 className={CARD_TITLE_CLASS}>{t("joinHeading")}</h2>
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
    </div>
  );
}
