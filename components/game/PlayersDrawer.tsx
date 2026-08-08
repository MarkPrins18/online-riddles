"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import type { CaseLogEntry } from "@/types/caseLog";
import { Drawer } from "@/components/ui/Drawer";
import { LeaveRoomButton } from "@/components/lobby/LeaveRoomButton";
import { ScoreBoard } from "./ScoreBoard";
import { CaseLog } from "./CaseLog";
import { NarratorTakeoverControl } from "./NarratorTakeoverControl";

/**
 * Everything that used to live in the always-visible sidebar (scoreboard,
 * case log, narrator takeover, leave button) — same components, unchanged
 * internally, just opened on demand instead of taking up permanent desk
 * space.
 */
export function PlayersDrawer({
  supabase,
  roomId,
  roomCode,
  playerId,
  players,
  caseLog,
  isHost,
  isRevealed,
  narratorId,
  onlinePlayerIds,
  onKick,
  onClose,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  roomCode: string;
  playerId: string;
  players: Player[];
  caseLog: CaseLogEntry[];
  isHost: boolean;
  isRevealed: boolean;
  narratorId: string | null;
  onlinePlayerIds?: Set<string>;
  onKick?: (playerId: string) => void;
  onClose: () => void;
}) {
  return (
    <Drawer title="Spelers" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div>
          <ScoreBoard players={players} onKick={onKick} onlinePlayerIds={onlinePlayerIds} />
          {isHost && !isRevealed && (
            <NarratorTakeoverControl
              supabase={supabase}
              roomId={roomId}
              players={players}
              currentNarratorId={narratorId}
              onlinePlayerIds={onlinePlayerIds}
            />
          )}
        </div>
        {caseLog.length > 0 && (
          <div className="border-t border-white/5 pt-4">
            <CaseLog entries={caseLog} />
          </div>
        )}
        <LeaveRoomButton
          supabase={supabase}
          roomId={roomId}
          roomCode={roomCode}
          players={players}
          playerId={playerId}
        />
      </div>
    </Drawer>
  );
}
