"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Drop-in trigger + content for "how does this game work" — there's
 * otherwise no rules explanation anywhere in the app. A self-contained
 * Modal (not a separate route) so it can sit next to CreateRoomForm/
 * JoinRoomForm on the homepage without losing their in-progress local
 * state on navigation, and be reused as-is in the room lobby.
 */
export function HowToPlayButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("HowToPlay");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-mono text-xs uppercase tracking-widest text-text-secondary underline decoration-accent/60 hover:text-accent ${className}`}
      >
        {t("trigger")}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 p-4">
            <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">
              {t("trigger")}
            </p>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
            <section>
              <p className="font-serif text-lg italic text-text-primary">{t("ideaTitle")}</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("ideaBody")}
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">{t("narratorTitle")}</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("narratorBody")}
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">
                {t("questionsTitle")}
              </p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("questionsBody")}
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">{t("solveTitle")}</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("solveBody")}
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">{t("pointsTitle")}</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("pointsBody")}
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">{t("hardcoreTitle")}</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("hardcoreBody")}
              </p>
            </section>

            <section>
              <p className="font-serif text-lg italic text-text-primary">{t("corkboardTitle")}</p>
              <p className="mt-1 font-mono text-sm leading-relaxed text-text-secondary">
                {t("corkboardBody")}
              </p>
            </section>
          </div>
        </Modal>
      )}
    </>
  );
}
