import { use } from "react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CreateRoomForm } from "@/components/lobby/CreateRoomForm";
import { JoinRoomForm } from "@/components/lobby/JoinRoomForm";
import { Card } from "@/components/ui/Card";
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
    <main id="main-content" className="flex flex-1 flex-col px-4 pb-12 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 py-5">
          <p className="font-display text-2xl uppercase tracking-wide sm:text-3xl">
            Detective<span className="text-accent">Nights</span>
          </p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold">
            <Link href="/community" className="hover:text-accent">
              {t("communityLink")}
            </Link>
            <NextLink href="/profile" className="hover:text-accent">
              {t("profileLink")}
            </NextLink>
            <HowToPlayButton />
            <LocalizedLanguageSwitcher pathname="/" />
          </nav>
        </header>

        {/* Paperback cover: the one big yellow surface on the page. */}
        <section className="relative overflow-hidden rounded-lg bg-accent px-6 pt-10 text-ink sm:px-11 sm:pt-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(var(--ink)_2.2px,transparent_2.6px)] bg-[length:12px_12px] opacity-[0.18]"
          />
          <div className="relative flex flex-wrap items-end gap-8">
            <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5 pb-10 sm:pb-12">
              <p className="self-start -rotate-2 bg-ink px-3 py-1.5 text-sm font-extrabold text-accent">
                {t("badge")}
              </p>
              <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-8xl">
                {t("heading")}
              </h1>
              <p className="max-w-xl text-lg font-medium leading-relaxed sm:text-xl">{t("lead")}</p>
            </div>
            <div className="relative hidden min-h-[360px] flex-[1_1_320px] items-end justify-center md:flex">
              <svg aria-hidden="true" viewBox="0 0 400 400" className="block h-auto w-full max-w-[400px]">
                <path
                  d="M120 150c0-14 40-24 80-24s80 10 80 24c0 6-10 10-24 13 4 8 6 18 6 28 0 34-28 62-62 62s-62-28-62-62c0-10 2-20 6-28-14-3-24-7-24-13Z"
                  fill="var(--ink)"
                />
                <path d="M150 126c4-30 24-46 50-46s46 16 50 46" fill="var(--ink)" />
                <path d="M60 400c4-80 60-130 140-130s136 50 140 130Z" fill="var(--ink)" />
                <rect x="128" y="150" width="144" height="12" fill="var(--danger)" />
              </svg>
              <p className="absolute left-0 top-6 max-w-[220px] rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-base font-bold shadow-[4px_4px_0_var(--ink)]">
                {t("exampleQuote")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 sm:grid-cols-2">
          <Card tone="case">
            <h2 className="mb-4 font-display text-2xl uppercase tracking-wide text-accent">{t("newFile")}</h2>
            <CreateRoomForm />
          </Card>
          <Card tone="case">
            <h2 className="mb-4 font-display text-2xl uppercase tracking-wide text-accent">{t("existingFile")}</h2>
            <JoinRoomForm />
          </Card>
        </section>

        <section className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="rounded-xl border-2 border-border bg-bg-secondary px-5 py-4">
              <h2 className="font-display text-xl uppercase tracking-wide text-accent">{step.title}</h2>
              <p className="mt-1.5 text-base leading-relaxed text-text-secondary">{step.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
