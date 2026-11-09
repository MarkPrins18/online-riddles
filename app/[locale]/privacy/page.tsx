import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { LocalizedLanguageSwitcher } from "@/components/LocalizedLanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("Privacy");
  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: locale === "nl" ? "/nl/privacy" : "/privacy" },
  };
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl uppercase tracking-wide text-accent">{heading}</h2>
      <p className="mt-2 text-base leading-relaxed text-text-primary/90">{body}</p>
    </div>
  );
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (isLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  return (
    <main id="main-content" className="flex flex-1 flex-col px-6 pb-14">
      <div className="mx-auto w-full max-w-[1180px]">
        <SiteHeader languageSwitcher={<LocalizedLanguageSwitcher pathname="/privacy" />} />
        <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-8 rounded-[10px] border-2 border-border bg-bg-secondary p-6 sm:p-10">
          <div>
            <h1 className="font-display text-5xl uppercase leading-none text-accent">{t("title")}</h1>
            <p className="mt-4 text-base leading-relaxed text-text-primary/90">
              {t("intro")}
            </p>
          </div>

          <Section heading={t("dataHeading")} body={t("dataBody")} />
          <Section heading={t("purposeHeading")} body={t("purposeBody")} />
          <Section heading={t("retentionHeading")} body={t("retentionBody")} />
          <Section heading={t("cookiesHeading")} body={t("cookiesBody")} />
          <Section heading={t("thirdPartyHeading")} body={t("thirdPartyBody")} />
          <Section heading={t("contactHeading")} body={t("contactBody")} />

          <Link
            href="/"
            className="self-start text-[15px] font-bold text-text-primary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
          >
            {t("backLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}
