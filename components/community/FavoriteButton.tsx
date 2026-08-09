"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { addFavorite, removeFavorite } from "@/lib/supabase/packFavorites";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

/**
 * A star toggle for a community pack's personal shortlist — favorited packs
 * later show up pre-selectable via "Gebruik mijn favorieten" in room-settings.
 * No session is minted until the first click, same lazy pattern as VoteButtons.
 */
export function FavoriteButton({
  packId,
  initialFavorited,
  className = "",
}: {
  packId: string;
  initialFavorited: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("FavoriteButton");

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      if (favorited) {
        await removeFavorite(supabase, packId, userId);
        setFavorited(false);
      } else {
        await addFavorite(supabase, packId, userId);
        setFavorited(true);
      }
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <Button
        type="button"
        variant="ghost"
        iconOnly
        disabled={isSaving}
        onClick={toggle}
        aria-label={favorited ? t("removeAriaLabel") : t("addAriaLabel")}
        className={favorited ? "text-accent" : ""}
      >
        {favorited ? "★" : "☆"}
      </Button>
      {error && <p className="font-mono text-xs text-danger">{error}</p>}
    </div>
  );
}
