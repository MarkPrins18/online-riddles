"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createRoom } from "@/lib/supabase/rooms";
import { joinRoom } from "@/lib/supabase/players";
import { storePlayerId } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

export function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const hostId = crypto.randomUUID();
      const room = await createRoom(supabase, hostId);
      const player = await joinRoom(supabase, room.id, name.trim(), true, userId, hostId);
      storePlayerId(room.code, player.id);
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(getErrorMessage(err, "Kon geen kamer aanmaken. Probeer het opnieuw."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="host-name" className="font-mono text-xs uppercase tracking-widest text-text-secondary">
        Jouw naam
      </label>
      <input
        id="host-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Rechercheur..."
        maxLength={24}
        className="rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
      />
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
      <Button type="submit" disabled={isSubmitting || !name.trim()}>
        {isSubmitting ? "Kamer aanmaken..." : "Nieuwe kamer starten"}
      </Button>
    </form>
  );
}
