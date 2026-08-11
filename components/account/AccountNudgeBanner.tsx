"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getAccountStatus } from "@/lib/supabase/accountAuth";
import type { StoryPack, Puzzle } from "@/types/puzzle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AccountModal } from "./AccountModal";

const DISMISS_KEY = "ors-account-nudge-dismissed";

/**
 * Contextual nudge shown only where losing account-less content is a real,
 * concrete risk (the user already has something to lose) — never a
 * blocking gate. Defaults to hidden until confirmed anonymous-with-content,
 * so there's no dismiss-flash on load.
 */
export function AccountNudgeBanner({
  packs,
  puzzles,
}: {
  packs: StoryPack[];
  puzzles: Puzzle[];
}) {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations("AccountNudgeBanner");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const status = await getAccountStatus(supabase);
      if (!cancelled) setIsAnonymous(!status || status.isAnonymous);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setIsDismissed(true);
  }

  function refreshAnonymity() {
    const supabase = createClient();
    void getAccountStatus(supabase).then((status) => setIsAnonymous(!status || status.isAnonymous));
  }

  if (isDismissed || !isAnonymous || (packs.length === 0 && puzzles.length === 0)) return null;

  return (
    <>
      <Card tone="case" className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-text-primary">{t("body")}</p>
        <div className="flex shrink-0 items-center gap-3">
          <Button onClick={() => setIsModalOpen(true)}>{t("cta")}</Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("dismissAriaLabel")}
            className="font-mono text-sm text-text-secondary hover:text-text-primary"
          >
            ×
          </button>
        </div>
      </Card>
      {isModalOpen && (
        <AccountModal
          onClose={() => {
            setIsModalOpen(false);
            refreshAnonymity();
          }}
        />
      )}
    </>
  );
}
