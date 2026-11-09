"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function RoomCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const t = useTranslations("RoomCodeDisplay");

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // No navigator.share feature-detection in the render path — that would
  // differ between server and client and cause a hydration mismatch. The
  // branch lives entirely inside this handler instead.
  async function handleShare() {
    const url = `${window.location.origin}/room/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("shareTitle"), url });
        return;
      } catch {
        // User cancelled the native share sheet, or it's unavailable — fall
        // through to a clipboard copy so they still have a way to share it.
      }
    }
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <button
        type="button"
        onClick={handleCopy}
        className="group flex cursor-pointer flex-col items-start gap-1 text-left"
        aria-label={t("ariaLabel")}
      >
        <span className="text-sm font-extrabold">{t("label")}</span>
        <span className="font-display text-7xl leading-none tracking-[0.08em] sm:text-8xl">{code}</span>
        <span className="text-sm font-bold underline decoration-2 underline-offset-2 group-hover:no-underline">
          {copied ? t("copied") : t("copyPrompt")}
        </span>
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="cursor-pointer rounded-[10px] border-[3px] border-ink bg-ink px-5 py-2.5 font-display text-xl uppercase tracking-[0.03em] text-accent transition-colors hover:bg-transparent hover:text-ink"
      >
        {linkCopied ? t("linkCopied") : t("shareLink")}
      </button>
    </div>
  );
}
