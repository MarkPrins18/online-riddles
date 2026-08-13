"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

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
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="group flex flex-col items-center gap-1 rounded-md border border-white/10 bg-bg-primary/60 px-6 py-4 transition-colors hover:border-accent-muted"
        aria-label={t("ariaLabel")}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          {t("label")}
        </span>
        <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-accent">
          {code}
        </span>
        <span className="font-mono text-xs text-text-secondary">
          {copied ? t("copied") : t("copyPrompt")}
        </span>
      </button>
      <Button variant="secondary" onClick={handleShare}>
        {linkCopied ? t("linkCopied") : t("shareLink")}
      </Button>
    </div>
  );
}
