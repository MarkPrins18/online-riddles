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

  // Only the language(s) you can switch *to*, styled as a plain nav link —
  // same look as LocalizedLanguageSwitcher on the [locale] pages.
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {locales
        .filter((option) => option !== locale)
        .map((option) => (
          <button
            key={option}
            type="button"
            lang={option}
            disabled={isPending}
            onClick={() => handleChange(option)}
            className="cursor-pointer text-[15px] font-bold text-text-secondary transition-colors hover:text-accent disabled:opacity-60"
          >
            {LOCALE_LABELS[option]}
          </button>
        ))}
    </span>
  );
}
