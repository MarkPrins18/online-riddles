"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { joinRoomByCode } from "@/lib/lobby/joinByCode";
import { storePlayerId } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";
import type { Room } from "@/types/room";

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
      const result = await joinRoomByCode(name.trim(), code.trim());
      if (result.status === "joined") {
        finishJoin(result.room, result.playerId);
        return;
      }
      setError(result.status === "full" ? t("roomFull") : t("noRoomFound"));
      setIsSubmitting(false);
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="join-name" className="text-sm font-bold text-text-secondary">
        {t("nameLabel")}
      </label>
      <input
        id="join-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        maxLength={24}
        className="rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-accent"
      />
      {!presetCode && (
        <>
          <label htmlFor="join-code" className="text-sm font-bold text-text-secondary">
            {t("codeLabel")}
          </label>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("codePlaceholder")}
            maxLength={6}
            className="rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base uppercase tracking-[0.3em] text-text-primary placeholder:tracking-normal placeholder:text-text-secondary/60 focus:border-accent"
          />
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={isSubmitting || !name.trim() || !code.trim()}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
