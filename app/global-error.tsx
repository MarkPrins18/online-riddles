"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "@/lib/i18n/locales";

// This replaces the entire <html>/<body> when the root layout itself
// crashes, so the NextIntlClientProvider it would normally read from is
// gone — locale is read straight from the cookie instead of useTranslations.
const COPY: Record<Locale, { title: string; retry: string }> = {
  en: { title: "Something went wrong", retry: "Try again" },
  nl: { title: "Er is iets misgegaan", retry: "Probeer opnieuw" },
};

function readLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${localeCookieName}=([^;]+)`));
  return isLocale(match?.[1]) ? (match![1] as Locale) : defaultLocale;
}

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  const locale = readLocale();
  const copy = COPY[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#15120e",
          color: "#ede7d8",
        }}
      >
        <h1>{copy.title}</h1>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "9999px",
            border: "1px solid #ede7d8",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {copy.retry}
        </button>
      </body>
    </html>
  );
}
