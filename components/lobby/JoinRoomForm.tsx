"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getRoomByCode } from "@/lib/supabase/rooms";
import { joinRoom } from "@/lib/supabase/players";
import { storePlayerId } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

export function JoinRoomForm({
  presetCode,
  onJoined,
}: {
  presetCode?: string;
  onJoined?: (playerId: string) => void;
} = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState(presetCode ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const room = await getRoomByCode(supabase, code.trim());
      if (!room) {
        setError("Geen kamer gevonden met die code.");
        setIsSubmitting(false);
        return;
      }

      const player = await joinRoom(supabase, room.id, name.trim(), false, userId);
      storePlayerId(room.code, player.id);

      if (onJoined) {
        onJoined(player.id);
      } else {
        router.push(`/room/${room.code}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Kon niet bij de kamer aansluiten. Probeer het opnieuw."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="join-name" className="font-mono text-xs uppercase tracking-widest text-text-secondary">
        Jouw naam
      </label>
      <input
        id="join-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Rechercheur..."
        maxLength={24}
        className="rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
      />
      {!presetCode && (
        <>
          <label htmlFor="join-code" className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            Roomcode
          </label>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={6}
            className="rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm uppercase tracking-[0.3em] text-text-primary placeholder:tracking-normal placeholder:text-text-secondary/60 focus:border-accent-muted"
          />
        </>
      )}
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button type="submit" variant="secondary" disabled={isSubmitting || !name.trim() || !code.trim()}>
        {isSubmitting ? "Aansluiten..." : "Kamer joinen"}
      </Button>
    </form>
  );
}
