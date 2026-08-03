"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { handlePlayerLeave } from "@/lib/game/membership";
import { clearStoredPlayerId } from "@/lib/session";
import { Button } from "@/components/ui/Button";

export function LeaveRoomButton({
  supabase,
  roomId,
  roomCode,
  players,
  playerId,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  roomCode: string;
  players: Player[];
  playerId: string;
}) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleLeave() {
    setIsLeaving(true);
    await handlePlayerLeave(supabase, roomId, players, playerId);
    clearStoredPlayerId(roomCode);
    router.push("/");
  }

  return (
    <Button variant="ghost" className="w-full" onClick={handleLeave} disabled={isLeaving}>
      {isLeaving ? "Verlaten..." : "Kamer verlaten"}
    </Button>
  );
}
