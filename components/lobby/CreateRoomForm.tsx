"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { createRoom } from "@/lib/supabase/rooms";
import { joinRoom } from "@/lib/supabase/players";
import { joinRoomByCode } from "@/lib/lobby/joinByCode";
import { storePlayerId } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";

const INPUT_CLASSES =
  "min-w-0 flex-[1_1_180px] rounded-[10px] border-[3px] border-ink bg-white px-3.5 py-3 text-[17px] text-ink placeholder:text-ink/45 focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--danger)]";

const BUTTON_CLASSES =
  "shrink-0 cursor-pointer rounded-[10px] border-[3px] border-ink bg-danger px-5 py-3 font-display text-xl uppercase tracking-[0.03em] text-ink transition-[filter] hover:brightness-110 disabled:cursor-not-allowed";

/**
 * The homepage's single start form: a name, then either "start a room"
 * (default) or "join with a code" — the join mode is one link away instead
 * of a second, competing form, so the page has one obvious action.
 */
export function CreateRoomForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("CreateRoomForm");
  const tJoin = useTranslations("JoinRoomForm");

  async function handleCreate() {
    const supabase = createClient();
    const userId = await ensureAnonymousSession(supabase);
    const hostId = crypto.randomUUID();
    const room = await createRoom(supabase, hostId);
    const player = await joinRoom(supabase, room.id, name.trim(), true, userId, hostId);
    storePlayerId(room.code, player.id);
    router.push(`/room/${room.code}`);
  }

  async function handleJoin() {
    const result = await joinRoomByCode(name.trim(), code.trim());
    if (result.status === "joined") {
      storePlayerId(result.room.code, result.playerId);
      router.push(`/room/${result.room.code}`);
      return;
    }
    setError(result.status === "full" ? tJoin("roomFull") : tJoin("noRoomFound"));
    setIsSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || (mode === "join" && !code.trim())) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await (mode === "create" ? handleCreate() : handleJoin());
    } catch (err) {
      setError(getErrorMessage(err, mode === "create" ? t("error") : tJoin("error")));
      setIsSubmitting(false);
    }
  }

  function switchMode(next: "create" | "join") {
    setMode(next);
    setError(null);
  }

  const nameMissing = !name.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-[516px] flex-col gap-3 rounded-[14px] border-[3px] border-ink bg-paper p-5 text-ink shadow-[6px_6px_0_var(--ink)]"
    >
      <label htmlFor="home-name" className="text-[15px] font-extrabold">
        {t("nameLabel")}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="home-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={24}
          className={INPUT_CLASSES}
        />
        {mode === "create" && (
          <button type="submit" disabled={isSubmitting || nameMissing} className={BUTTON_CLASSES}>
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        )}
      </div>

      {mode === "join" && (
        <>
          <label htmlFor="home-code" className="text-[15px] font-extrabold">
            {tJoin("codeLabel")}
          </label>
          <div className="flex flex-wrap gap-2.5">
            <input
              id="home-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={tJoin("codePlaceholder")}
              maxLength={6}
              className={`${INPUT_CLASSES} uppercase tracking-[0.3em] placeholder:tracking-normal`}
            />
            <button
              type="submit"
              disabled={isSubmitting || nameMissing || !code.trim()}
              className={BUTTON_CLASSES}
            >
              {isSubmitting ? tJoin("submitting") : tJoin("submit")}
            </button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-bold text-[#b33a28]">
          {error}
        </p>
      )}

      <p className="text-[15px] font-medium">
        {mode === "create" ? t("joinPrompt") : t("createPrompt")}{" "}
        <button
          type="button"
          onClick={() => switchMode(mode === "create" ? "join" : "create")}
          className="cursor-pointer font-extrabold underline underline-offset-[3px] hover:text-[#b33a28]"
        >
          {mode === "create" ? t("joinLink") : t("createLink")}
        </button>
      </p>
    </form>
  );
}
