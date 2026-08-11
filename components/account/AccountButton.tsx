"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getAccountStatus, signOut, type AccountStatus } from "@/lib/supabase/accountAuth";
import { getErrorMessage } from "@/lib/errors";
import { AccountModal } from "./AccountModal";

/**
 * Always-visible, never-blocking entry point for the optional account
 * upgrade — sits next to CommunityNav's tab links. Anonymous visitors see
 * a plain "Account" trigger; everything else in the nav keeps working
 * whether or not they ever click it.
 */
export function AccountButton() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("AccountButton");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const current = await getAccountStatus(supabase);
      if (!cancelled) setStatus(current);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);
    try {
      const supabase = createClient();
      await signOut(supabase);
      setStatus(null);
    } catch (err) {
      setError(getErrorMessage(err, t("signOutError")));
    } finally {
      setIsSigningOut(false);
    }
  }

  if (status && !status.isAnonymous) {
    return (
      <div className="ml-auto flex items-center gap-2 self-center font-mono text-xs text-text-secondary">
        <span className="hidden sm:inline">{status.email}</span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="uppercase tracking-widest underline decoration-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? t("signingOut") : t("signOut")}
        </button>
        {error && (
          <span role="alert" className="text-danger">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="ml-auto self-center font-mono text-xs uppercase tracking-widest text-text-secondary underline decoration-accent/60 hover:text-accent"
      >
        {t("trigger")}
      </button>
      {isModalOpen && (
        <AccountModal
          onClose={() => {
            setIsModalOpen(false);
            // No onAuthStateChange listener exists in this app — re-check
            // status on close so a successful upgrade/login is reflected
            // without requiring a full page reload.
            const supabase = createClient();
            void getAccountStatus(supabase).then(setStatus);
          }}
        />
      )}
    </>
  );
}
