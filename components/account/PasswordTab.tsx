"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { upgradeWithPassword, signInWithPassword } from "@/lib/supabase/accountAuth";
import { describeAccountError } from "./accountErrors";
import { Button } from "@/components/ui/Button";

const inputClasses =
  "rounded-md border border-white/10 bg-bg-primary px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-muted";
const labelClasses = "font-mono text-xs uppercase tracking-widest text-text-secondary";

const EMAIL_IN_USE_CODES = new Set(["user_already_exists", "email_exists"]);

type Mode = "upgrade" | "login";

/**
 * updateUser({email, password}) only ever upgrades the CURRENT anonymous
 * session (first-time case) — it can't sign in to a different, pre-existing
 * account. Returning users on a new device need the separate
 * signInWithPassword call instead, hence the explicit mode toggle here
 * (unlike MagicLinkTab, where verifyOtp handles both cases on its own).
 */
export function PasswordTab({
  onSuccess,
}: {
  onSuccess: (result: { pending: boolean }) => void;
}) {
  const [mode, setMode] = useState<Mode>("upgrade");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("PasswordTab");
  const tErrors = useTranslations("AccountErrors");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      if (mode === "upgrade") {
        await ensureAnonymousSession(supabase);
        const emailRedirectTo = `${window.location.origin}/auth/confirm?next=/community/mijn`;
        await upgradeWithPassword(supabase, trimmedEmail, password, emailRedirectTo);
        onSuccess({ pending: true });
      } else {
        await signInWithPassword(supabase, trimmedEmail, password);
        onSuccess({ pending: false });
      }
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (mode === "upgrade" && code && EMAIL_IN_USE_CODES.has(code)) {
        setMode("login");
      }
      setError(describeAccountError(err, tErrors));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="font-mono text-xs text-text-secondary">
          {mode === "upgrade" ? t("upgradeIntro") : t("loginIntro")}
        </p>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "upgrade" ? "login" : "upgrade"));
            setError(null);
          }}
          className="self-start font-mono text-xs uppercase tracking-widest text-accent underline decoration-accent/60 hover:text-accent-muted sm:shrink-0 sm:self-auto"
        >
          {mode === "upgrade" ? t("switchToLogin") : t("switchToUpgrade")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="password-tab-email" className={labelClasses}>
          {t("emailLabel")}
        </label>
        <input
          id="password-tab-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className={inputClasses}
        />

        <label htmlFor="password-tab-password" className={labelClasses}>
          {t("passwordLabel")}
        </label>
        <input
          id="password-tab-password"
          type="password"
          autoComplete={mode === "upgrade" ? "new-password" : "current-password"}
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          className={inputClasses}
        />

        {mode === "login" && (
          <p className="font-mono text-xs text-text-secondary">{t("orphanWarning")}</p>
        )}

        {error && (
          <p role="alert" className="font-mono text-xs text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting || !email.trim() || !password}>
          {isSubmitting ? t("saving") : mode === "upgrade" ? t("submitUpgrade") : t("submitLogin")}
        </Button>
      </form>
    </div>
  );
}
