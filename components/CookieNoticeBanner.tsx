"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const DISMISS_KEY = "ors-cookie-notice-dismissed";
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

// The server can't read localStorage — render dismissed there, and for the
// client's first hydration pass too (which must match the server exactly
// or React discards and fully re-renders this subtree). useSyncExternalStore
// re-reads the real value right after hydration, without the mismatch a
// plain `useState(() => localStorage...)` or a bare setState-in-useEffect
// would cause.
function getServerSnapshot() {
  return true;
}

/**
 * Passive disclosure, not a consent flow — the only cookies this app sets
 * (Supabase session, locale) are strictly necessary, so there's nothing to
 * opt in/out of under GDPR. Just a link to /privacy and a dismiss button.
 */
export function CookieNoticeBanner() {
  const isDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations("CookieNoticeBanner");

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    listeners.forEach((listener) => listener());
  }

  if (isDismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-4 border-t border-white/[0.08] bg-bg-secondary px-4 py-3">
      <p className="font-mono text-xs text-text-secondary">
        {t("message")}{" "}
        <Link href="/privacy" className="underline decoration-accent/60 hover:text-accent">
          {t("linkLabel")}
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismissAriaLabel")}
        className="shrink-0 font-mono text-xs uppercase tracking-widest text-text-secondary hover:text-accent"
      >
        {t("dismiss")}
      </button>
    </div>
  );
}
