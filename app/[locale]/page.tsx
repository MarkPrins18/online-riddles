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
          <div className="relative hidden min-h-[420px] min-w-0 flex-[1_1_360px] items-center justify-center self-stretch pb-11 pt-6 lg:flex">
            {/* The two classic detective props, big and tilted: a fedora
                (red band) and a magnifying glass. No figure — a person built
                from simple shapes reads as clumsy. The speech bubble is
                anchored to the drawing's top edge, so it never covers it. */}
            <div className="relative w-full max-w-[440px]">
              <svg aria-hidden="true" viewBox="0 0 400 400" className="block h-auto w-full max-w-[440px]">
                <g transform="rotate(-8 200 200)">
                  <path
                    d="M120 210 L134 120 Q142 94 180 98 Q200 112 220 98 Q258 94 266 120 L280 210 Z"
                    fill="var(--ink)"
                  />
                  <path d="M126 172 L274 172 L278 200 L122 200 Z" fill="var(--danger)" />
                  <ellipse cx="200" cy="212" rx="150" ry="26" fill="var(--ink)" />
                </g>
                <g transform="rotate(35 290 300)">
                  <circle cx="290" cy="270" r="46" fill="rgba(255, 255, 255, 0.55)" />
                  <circle cx="290" cy="270" r="54" fill="none" stroke="var(--ink)" strokeWidth="16" />
                  <rect x="280" y="324" width="20" height="74" rx="8" fill="var(--ink)" />
                </g>
              </svg>
              <p className="absolute left-0 top-[8%] max-w-[258px] -translate-y-1/2 rounded-[18px] border-[3px] border-ink bg-white px-4 py-3 text-base font-bold shadow-[4px_4px_0_var(--ink)]">
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
