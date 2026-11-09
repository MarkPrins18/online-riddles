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
export function HowToPlayButton({
  className = "",
  variant = "underlined",
}: {
  className?: string;
  /** "plain": a nav-style text link (homepage header) instead of the
   * underlined inline link used in the room lobby. */
  variant?: "underlined" | "plain";
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("HowToPlay");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cursor-pointer font-bold hover:text-accent ${
          variant === "plain"
            ? "text-[15px] text-text-primary"
            : "text-sm text-text-secondary underline decoration-accent/60"
        } ${className}`}
      >
        {t("trigger")}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between gap-3 border-b-2 border-border px-6 py-4">
            <h2 className="font-display text-3xl uppercase tracking-wide text-accent">
              {t("trigger")}
            </h2>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("ideaTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("ideaBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("narratorTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("narratorBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">
                {t("questionsTitle")}
              </h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("questionsBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("solveTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("solveBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("pointsTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("pointsBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("hardcoreTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("hardcoreBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("saboteurTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("saboteurBody")}
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl uppercase tracking-wide text-accent">{t("corkboardTitle")}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-text-primary/90">
                {t("corkboardBody")}
              </p>
            </section>
          </div>
        </Modal>
      )}
    </>
  );
}
