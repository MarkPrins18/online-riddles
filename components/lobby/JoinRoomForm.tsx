"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getRoomByCode } from "@/lib/supabase/rooms";
import { joinRoom, findReclaimablePlayer, reclaimPlayer } from "@/lib/supabase/players";
import { storePlayerId } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";
import type { Room } from "@/types/room";
import type { Player } from "@/types/player";

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
  // Set when the typed name matches an existing player in the room —
  // holds off on creating a new player row until the user confirms whether
  // that's them (reclaim) or a coincidence (join fresh). See
  // findReclaimablePlayer for why this only fires on an unambiguous match.
  const [reclaimCandidate, setReclaimCandidate] = useState<{ room: Room; player: Player } | null>(
    null
  );
  const t = useTranslations("JoinRoomForm");

  function finishJoin(room: Room, playerId: string) {
    storePlayerId(room.code, playerId);
    if (onJoined) {
      onJoined(playerId);
    } else {
      router.push(`/room/${room.code}`);
    }
  }

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
        setError(t("noRoomFound"));
        setIsSubmitting(false);
        return;
      }

      const match = await findReclaimablePlayer(supabase, room.id, name.trim());
      if (match) {
        setReclaimCandidate({ room, player: match });
        setIsSubmitting(false);
        return;
      }

      const player = await joinRoom(supabase, room.id, name.trim(), false, userId);
      finishJoin(room, player.id);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
      setIsSubmitting(false);
    }
  }

  async function handleReclaim() {
    if (!reclaimCandidate) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      await ensureAnonymousSession(supabase);
      const { room, player } = reclaimCandidate;
      await reclaimPlayer(supabase, room.id, player.id, name.trim());
      finishJoin(room, player.id);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
      setIsSubmitting(false);
    }
  }

  async function handleJoinAsNew() {
    if (!reclaimCandidate) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const { room } = reclaimCandidate;
      const player = await joinRoom(supabase, room.id, name.trim(), false, userId);
      finishJoin(room, player.id);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
      setIsSubmitting(false);
    } finally {
      setReclaimCandidate(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="join-name" className="font-mono text-xs uppercase tracking-widest text-text-secondary">
        {t("nameLabel")}
      </label>
      <input
        id="join-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setReclaimCandidate(null);
        }}
        placeholder={t("namePlaceholder")}
        maxLength={24}
        className="rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
      />
      {!presetCode && (
        <>
          <label htmlFor="join-code" className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("codeLabel")}
          </label>
          <input
            id="join-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setReclaimCandidate(null);
            }}
            placeholder={t("codePlaceholder")}
            maxLength={6}
            className="rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm uppercase tracking-[0.3em] text-text-primary placeholder:tracking-normal placeholder:text-text-secondary/60 focus:border-accent-muted"
          />
        </>
      )}
      {error && (
        <p role="alert" className="font-mono text-xs text-danger">
          {error}
        </p>
      )}
      {reclaimCandidate ? (
        <div className="flex flex-col gap-2 rounded-md border border-accent-muted/40 bg-bg-primary/60 p-3">
          <p className="font-mono text-xs text-text-secondary">
            {t("reclaimPrompt", { name: reclaimCandidate.player.name })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReclaim}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? t("submitting") : t("reclaimConfirm")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleJoinAsNew}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t("reclaimDecline")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" variant="secondary" disabled={isSubmitting || !name.trim() || !code.trim()}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      )}
    </form>
  );
}
