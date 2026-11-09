"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { requestEmailCode, verifyEmailCode } from "@/lib/supabase/accountAuth";
import { describeAccountError } from "./accountErrors";
import { Button } from "@/components/ui/Button";

const inputClasses =
  "rounded-lg border-2 border-border bg-bg-primary px-3 py-2.5 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-accent";
const labelClasses = "text-sm font-bold text-text-secondary";

// Not a real rate limiter — the shared 2-emails/hour Supabase quota is
// enforced server-side regardless. This is pure UX friction to stop
// accidental double-clicks from burning through that small budget.
const RESEND_COOLDOWN_SECONDS = 30;

type Step = "email" | "code";

/**
 * signInWithOtp + verifyOtp handles both "first time" and "returning user"
 * transparently — Supabase decides at verify time whether this email links
 * to the current anonymous session or signs in to a pre-existing account —
 * so there's no separate upgrade/login mode to choose here.
 */
export function MagicLinkTab({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const t = useTranslations("MagicLinkTab");
  const tErrors = useTranslations("AccountErrors");

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function sendCode() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || cooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      await ensureAnonymousSession(supabase);
      await requestEmailCode(supabase, trimmedEmail);
      setStep("code");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(describeAccountError(err, tErrors));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      await verifyEmailCode(supabase, email.trim(), code.trim());
      onSuccess();
    } catch (err) {
      setError(describeAccountError(err, tErrors));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "email") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode();
        }}
        className="flex flex-col gap-3"
      >
        <p className="text-xs text-text-secondary">{t("intro")}</p>
        <label htmlFor="magic-link-email" className={labelClasses}>
          {t("emailLabel")}
        </label>
        <input
          id="magic-link-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className={inputClasses}
        />
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting || !email.trim()}>
          {isSubmitting ? t("sending") : t("requestCode")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-3">
      <p className="text-xs text-text-secondary">{t("codeSentIntro", { email })}</p>
      <label htmlFor="magic-link-code" className={labelClasses}>
        {t("codeLabel")}
      </label>
      <input
        id="magic-link-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        // Code length is a Supabase project setting (Authentication →
        // Emails → OTP length), not something this app controls — don't
        // hardcode a specific digit count here, just a generous upper bound.
        maxLength={10}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("codePlaceholder")}
        className={inputClasses}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="text-sm font-bold text-text-secondary underline decoration-accent/60 hover:text-accent"
        >
          {t("back")}
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || isSubmitting}
          onClick={() => void sendCode()}
          className="text-sm font-bold text-accent underline decoration-accent/60 hover:text-accent-muted disabled:cursor-not-allowed disabled:text-text-secondary disabled:no-underline"
        >
          {cooldown > 0 ? t("resendCooldown", { seconds: cooldown }) : t("resendCode")}
        </button>
      </div>
      <Button type="submit" disabled={isSubmitting || !code.trim()}>
        {isSubmitting ? t("verifying") : t("verify")}
      </Button>
    </form>
  );
}
