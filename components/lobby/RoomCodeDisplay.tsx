"use client";

import { useState } from "react";

export function RoomCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex flex-col items-center gap-1 rounded-md border border-white/10 bg-bg-primary/60 px-6 py-4 transition-colors hover:border-accent-muted"
      aria-label="Kopieer roomcode"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-text-secondary">
        Roomcode
      </span>
      <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-accent">
        {code}
      </span>
      <span className="font-mono text-xs text-text-secondary">
        {copied ? "Gekopieerd" : "Klik om te kopiëren"}
      </span>
    </button>
  );
}
