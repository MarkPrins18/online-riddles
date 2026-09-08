"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getAccountStatus, signOut } from "@/lib/supabase/accountAuth";
import { getProfile } from "@/lib/supabase/profiles";
import { getErrorMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MagicLinkTab } from "./MagicLinkTab";
import { SetNameForm } from "@/components/community/SetNameForm";

type Phase =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "signedIn"; email: string | null; hasName: boolean };

/**
 * Shared surface for both entry points (AccountButton, AccountNudgeBanner).
 * Always optional: closing this without doing anything leaves the current
 * anonymous session exactly as it was, with all existing functionality
 * untouched.
 */
export function AccountModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const t = useTranslations("AccountModal");

  async function refreshStatus(guard?: () => boolean) {
    const supabase = createClient();
    const status = await getAccountStatus(supabase);
    if (guard && !guard()) return;
    if (status && !status.isAnonymous) {
      const profile = await getProfile(supabase, status.id);
      if (guard && !guard()) return;
      setPhase({ kind: "signedIn", email: status.email, hasName: !!profile });
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

        {phase.kind === "signedIn" && !phase.hasName && (
          <SetNameForm
            onDone={() => void refreshStatus()}
            showAccountNudge={false}
            variant="account"
            bare
          />
        )}

        {phase.kind === "signedIn" && phase.hasName && (
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

        {phase.kind === "anonymous" && <MagicLinkTab onSuccess={() => void refreshStatus()} />}
      </div>
    </Modal>
  );
}
