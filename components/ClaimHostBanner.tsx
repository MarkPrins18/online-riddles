"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { claimHost } from "@/lib/supabase/players";
import { pickNextHost } from "@/lib/game/membership";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

/**
 * Only ever renders for the one deterministic successor (see
 * pickNextHost) when the current host has dropped off Presence — not
 * shown to every player, so there's exactly one obvious person to act,
 * not a race to be first.
 */
export function ClaimHostBanner({
  supabase,
  roomId,
  players,
  hostId,
  onlinePlayerIds,
  playerId,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  players: Player[];
  hostId: string;
  onlinePlayerIds: Set<string>;
  playerId: string | null;
}) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("ClaimHostBanner");

  const successor = pickNextHost(players, onlinePlayerIds, hostId);
  if (!playerId || successor?.id !== playerId) return null;

  async function handleClaim() {
    setIsClaiming(true);
    setError(null);
    try {
      await claimHost(supabase, roomId, playerId!);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-danger/40 bg-danger/5 p-3">
      <p className="font-mono text-xs text-text-secondary">{t("message")}</p>
      <Button variant="danger" onClick={handleClaim} disabled={isClaiming} className="w-full">
        {isClaiming ? t("claiming") : t("claim")}
      </Button>
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
    </div>
  );
}
