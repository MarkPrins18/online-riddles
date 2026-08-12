"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getAccountStatus, signOut } from "@/lib/supabase/accountAuth";
import { getErrorMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PasswordTab } from "./PasswordTab";
import { MagicLinkTab } from "./MagicLinkTab";

type Tab = "magicLink" | "password";

type Phase =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "signedIn"; email: string | null }
  | { kind: "pendingConfirmation" };

const TAB_CLASSES = (isActive: boolean) =>
  `tab-shape border border-b-0 px-4 pb-2 pt-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
    isActive
      ? "border-accent/40 bg-bg-secondary text-accent"
      : "border-white/10 bg-transparent text-text-secondary hover:text-text-primary"
  }`;

/**
 * Shared surface for both entry points (AccountButton, AccountNudgeBanner).
 * Always optional: closing this without doing anything leaves the current
 * anonymous session exactly as it was, with all existing functionality
 * untouched.
 */
export function AccountModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("magicLink");
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const t = useTranslations("AccountModal");

  async function refreshStatus(guard?: () => boolean) {
    const supabase = createClient();
    const status = await getAccountStatus(supabase);
    if (guard && !guard()) return;
    if (status && !status.isAnonymous) {
      setPhase({ kind: "signedIn", email: status.email });
    } else {
      setPhase({ kind: "anonymous" });
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      await ensureAnonymousSession(supabase);
      if (cancelled) return;
      await refreshStatus(() => !cancelled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      const supabase = createClient();
      await signOut(supabase);
      onClose();
    } catch (err) {
      setSignOutError(getErrorMessage(err, t("signOutError")));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Modal onClose={onClose} className="mx-auto w-full max-w-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 p-4">
        <p className="font-mono text-sm uppercase tracking-widest text-text-secondary">
          {t("title")}
        </p>
        <Button variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {phase.kind === "loading" && (
          <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>
        )}

        {phase.kind === "signedIn" && (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-sm text-text-primary">
              {t("signedInAs", { email: phase.email ?? "" })}
            </p>
            {signOutError && (
              <p role="alert" className="font-mono text-xs text-danger">
                {signOutError}
              </p>
            )}
            <Button variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? t("signingOut") : t("signOut")}
            </Button>
          </div>
        )}

        {phase.kind === "pendingConfirmation" && (
          <p className="font-mono text-sm text-text-primary">{t("pendingConfirmation")}</p>
        )}

        {phase.kind === "anonymous" && (
          <>
            <p className="font-mono text-xs text-text-secondary">{t("explainer")}</p>

            <div className="flex gap-1 border-b border-white/10">
              <button type="button" onClick={() => setTab("magicLink")} className={TAB_CLASSES(tab === "magicLink")}>
                {t("tabMagicLink")}
              </button>
              <button type="button" onClick={() => setTab("password")} className={TAB_CLASSES(tab === "password")}>
                {t("tabPassword")}
              </button>
            </div>

            {tab === "magicLink" ? (
              <MagicLinkTab onSuccess={() => void refreshStatus()} />
            ) : (
              <PasswordTab
                onSuccess={({ pending }) =>
                  pending ? setPhase({ kind: "pendingConfirmation" }) : void refreshStatus()
                }
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
