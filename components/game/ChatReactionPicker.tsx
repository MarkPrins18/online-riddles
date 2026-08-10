"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { getRecentEmojis, recordEmojiUse } from "@/lib/ui/emojiHistory";
import { EMOJI_CATEGORIES } from "@/lib/ui/emojiCatalog";
import { isSingleEmoji } from "@/lib/game/emoji";

/**
 * The WhatsApp-style reaction popover: a quick bar of recently/commonly
 * used emoji plus a "+" that expands into a small categorized grid, with a
 * free-text fallback at the bottom for anything not in the grid (the web
 * has no API to open the OS/keyboard's own emoji picker on demand, so this
 * curated grid + paste field stands in for it).
 */
export function ChatReactionPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("ChatMessageReactions");
  const recent = getRecentEmojis();

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function pick(emoji: string) {
    recordEmojiUse(emoji);
    onPick(emoji);
  }

  function handleCustomSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = customValue.trim();
    if (!isSingleEmoji(trimmed)) {
      setCustomError(t("invalidEmoji"));
      return;
    }
    pick(trimmed);
  }

  return (
    <div
      ref={containerRef}
      role="menu"
      className="absolute z-10 mt-1 rounded-lg border border-white/10 bg-bg-secondary p-2 shadow-lg"
    >
      {!expanded ? (
        <div className="flex items-center gap-1.5">
          {recent.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              aria-label={t("addLabel", { emoji })}
              className="rounded-full p-1 text-lg leading-none hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t("morePicker")}
            className="rounded-full border border-white/15 px-2 py-1 text-xs leading-none text-text-secondary hover:border-accent-muted"
          >
            +
          </button>
        </div>
      ) : (
        <div className="flex max-h-56 w-56 flex-col gap-2 overflow-y-auto">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.labelKey}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
                {t(category.labelKey)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => pick(emoji)}
                    aria-label={t("addLabel", { emoji })}
                    className="rounded-full p-1 text-base leading-none hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1 border-t border-white/10 pt-2">
            <input
              value={customValue}
              onChange={(e) => {
                setCustomValue(e.target.value);
                setCustomError(null);
              }}
              placeholder={t("customPlaceholder")}
              aria-label={t("customLabel")}
              maxLength={8}
              className="w-full rounded-md border border-white/10 bg-bg-primary px-1.5 py-1 font-mono text-xs text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted"
            />
            <button
              type="submit"
              disabled={!customValue.trim()}
              className="shrink-0 rounded-md border border-white/10 px-1.5 py-1 font-mono text-[10px] uppercase tracking-widest text-text-secondary hover:border-accent-muted disabled:opacity-50"
            >
              {t("customSubmit")}
            </button>
          </form>
          {customError && (
            <p role="alert" className="font-mono text-[10px] text-danger">
              {customError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
