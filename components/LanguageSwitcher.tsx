"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { locales, type Locale } from "@/lib/i18n/locales";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  nl: "NL",
};

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-text-secondary ${className}`}
    >
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          disabled={isPending}
          onClick={() => handleChange(option)}
          aria-pressed={option === locale}
          className={`rounded-sm px-2 py-1 transition-colors disabled:opacity-60 ${
            option === locale
              ? "bg-accent text-bg-primary"
              : "hover:text-accent"
          }`}
        >
          {LOCALE_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
