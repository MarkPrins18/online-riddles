"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import { getSessionRecap } from "@/lib/game/recap";
import { generateRecapImage } from "@/lib/game/recapImage";
import { getErrorMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Renders the same session data SessionRecapPanel shows in-app as a
 * "case closed" report card image, so a group can actually take something
 * away from the night instead of it just living in the app. Preview-first
 * (not a silent direct share/download) so people can see what they're
 * about to send before it goes out. Fetches its own copy of the recap
 * (same cheap, once-per-game-end query SessionRecapPanel already does)
 * rather than requiring the parent to lift that state — keeps both
 * components independent.
 */
export function ShareRecapButton({
  supabase,
  roomId,
  players,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  players: Player[];
}) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const t = useTranslations("ShareRecapButton");

  // Revokes the previous object URL whenever a new one replaces it (or the
  // component unmounts) — otherwise each generated image leaks.
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  async function handleOpen() {
    setOpen(true);
    setIsGenerating(true);
    setError(null);
    try {
      const recap = await getSessionRecap(supabase, roomId);
      const blob = await generateRecapImage(players, recap);
      if (!blob) throw new Error(t("generateError"));
      setImageBlob(blob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(getErrorMessage(err, t("recapError")));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleShare() {
    if (!imageBlob) return;
    const file = new File([imageBlob], "online-riddles-zaak-gesloten.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: t("shareTitle"),
        });
        return;
      } catch {
        // User cancelled the native share sheet, or it failed — fall
        // through to download so they still have a way to get the image.
      }
    }

    const link = document.createElement("a");
    link.href = imageUrl!;
    link.download = "online-riddles-zaak-gesloten.png";
    link.click();
  }

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={handleOpen}>
        {t("share")}
      </Button>

      {open && (
        <Modal onClose={() => setOpen(false)} className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 p-4">
            <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">
              {t("caseClosed")}
            </p>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-5">
            {isGenerating && (
              <p className="font-mono text-sm text-text-secondary">{t("generating")}</p>
            )}
            {error && <p className="font-mono text-sm text-danger">{error}</p>}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a generated blob: URL, not an optimizable remote/static asset
              <img
                src={imageUrl}
                alt={t("recapImageAlt")}
                className="w-full max-w-xs rounded-md border border-white/10"
              />
            )}
            {imageBlob && (
              <Button className="w-full max-w-xs" onClick={handleShare}>
                {t("shareOrDownload")}
              </Button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
