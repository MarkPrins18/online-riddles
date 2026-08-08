"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { setNarrator } from "@/lib/supabase/players";
import { Button } from "@/components/ui/Button";

/**
 * Host-only manual escape hatch — e.g. the Verteller is technically still
 * online but AFK/unresponsive, or the host wants to hand the role off for
 * some other reason. Genuine disconnects are handled automatically instead
 * (see GamePlayClient's narrator-offline effect and
 * lib/game/membership.ts: pickNarratorTakeoverElector /
 * pickRandomOnlineCandidate), so this always starts collapsed — it's not
 * the tool for that case anymore. One button per candidate rather than a
 * <select>, so a long name wraps instead of getting clipped in the narrow
 * sidebar.
 */
export function NarratorTakeoverControl({
  supabase,
  roomId,
  players,
  currentNarratorId,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  players: Player[];
  currentNarratorId: string | null;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const candidates = players.filter((p) => p.id !== currentNarratorId && !p.is_spectator);
  if (candidates.length === 0) return null;

  async function handleTransfer(playerId: string) {
    setSavingId(playerId);
    await setNarrator(supabase, roomId, playerId);
    setSavingId(null);
  }

  return (
    <details className="mt-4 border-t border-white/5 pt-4">
      <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-text-secondary">
        Verteller afwezig?
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        {candidates.map((player) => (
          <Button
            key={player.id}
            variant="secondary"
            className="w-full whitespace-normal break-words"
            onClick={() => handleTransfer(player.id)}
            disabled={savingId !== null}
          >
            {savingId === player.id ? "Bezig..." : `Wissel naar ${player.name}`}
          </Button>
        ))}
        <p className="font-mono text-xs text-text-secondary">
          Huidige vragen en gokken blijven staan.
        </p>
      </div>
    </details>
  );
}
