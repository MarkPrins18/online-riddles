import { use } from "react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CreateRoomForm } from "@/components/lobby/CreateRoomForm";
import { HowToPlayButton } from "@/components/HowToPlayButton";
import { LocalizedLanguageSwitcher } from "@/components/LocalizedLanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { isLocale } from "@/lib/i18n/locales";

// No title/description override — the root layout's default ("DetectiveNights"
// / the tagline) already fits the homepage; only the canonical needs to be
// locale-aware here (see CommunityPage's generateMetadata for why a plain
// relative path isn't enough once /nl exists as a separate URL).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: { canonical: locale === "nl" ? "/nl" : "/" },
  };
}

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (isLocale(locale)) setRequestLocale(locale);
  const t = useTranslations("HomePage");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <main id="main-content" className="flex flex-1 flex-col px-6 pb-14">
      <div className="mx-auto w-full max-w-[1180px]">
        <header className="flex flex-wrap items-center justify-between gap-4 py-[22px]">
          <Link href="/" className="font-display text-[28px] uppercase tracking-[0.02em] text-text-primary">
            Detective<span className="text-accent">Nights</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-[22px] text-[15px] font-bold">
            <Link href="/community" className="text-text-primary hover:text-accent">
              {t("communityLink")}
            </Link>
            <HowToPlayButton variant="plain" />
            <NextLink href="/profile" className="text-text-primary hover:text-accent">
              {t("profileLink")}
            </NextLink>
            <LocalizedLanguageSwitcher pathname="/" />
          </nav>
        </header>

        {/* Paperback cover: the one big yellow surface on the page. */}
        <section className="relative flex flex-wrap items-end gap-8 overflow-hidden rounded-md bg-accent px-6 pt-12 text-ink sm:px-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(var(--ink)_2.2px,transparent_2.6px)] bg-[length:12px_12px] opacity-[0.18]"
          />
          <div className="relative flex min-w-0 flex-[1_1_480px] flex-col gap-[22px] pb-11">
            <p className="self-start -rotate-2 bg-ink px-3 py-1.5 text-sm font-extrabold text-accent">
              {t("badge")}
            </p>
            <h1 className="whitespace-pre-line font-display text-[64px] uppercase leading-[0.9] tracking-[0.005em] sm:text-[104px]">
              {t("heading")}
            </h1>
            <p className="max-w-[28em] text-xl font-medium leading-normal">{t("lead")}</p>
            <CreateRoomForm />
          </div>
          <div className="relative hidden min-h-[420px] min-w-0 flex-[1_1_360px] items-end justify-center md:flex">
            {/* Detective silhouette: shoulders, neck, head, then the fedora
                (crown with a pinched top, red band, brim) drawn over it. The
                speech bubble is anchored to the drawing itself, centered on
                its top edge, so it always sits above the hat at any width. */}
            <div className="relative w-full max-w-[440px]">
              <svg aria-hidden="true" viewBox="0 0 400 400" className="block h-auto w-full max-w-[440px]">
                <path d="M60 400c4-80 60-130 140-130s136 50 140 130Z" fill="var(--ink)" />
                <rect x="178" y="236" width="44" height="44" fill="var(--ink)" />
                <circle cx="200" cy="198" r="54" fill="var(--ink)" />
                <path
                  d="M145 140 L152 92 Q158 76 182 79 Q200 90 218 79 Q242 76 248 92 L255 140 Z"
                  fill="var(--ink)"
                />
                <path d="M149.3 110 L250.7 110 L253 127 L147 127 Z" fill="var(--danger)" />
                <ellipse cx="200" cy="140" rx="92" ry="15" fill="var(--ink)" />
              </svg>
              <p className="absolute left-0 top-0 max-w-[258px] -translate-y-1/2 rounded-[18px] border-[3px] border-ink bg-white px-4 py-3 text-base font-bold shadow-[4px_4px_0_var(--ink)]">
                {t("exampleQuote")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {steps.map((step) => (
            <div key={step.title} className="rounded-[10px] border-2 border-border bg-bg-secondary px-5 py-[18px]">
              <h2 className="font-display text-[22px] uppercase text-accent">{step.title}</h2>
              <p className="mt-1.5 text-base leading-normal text-[#cfc7b5]">{step.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
