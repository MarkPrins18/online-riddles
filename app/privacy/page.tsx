import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("title") };
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <div>
      <h2 className="font-serif text-lg italic text-text-primary">{heading}</h2>
      <p className="mt-2 font-mono text-sm leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <Card tone="case" className="flex flex-col gap-8">
          <div>
            <h1 className="font-serif text-3xl italic text-text-primary">{t("title")}</h1>
            <p className="mt-3 font-mono text-sm leading-relaxed text-text-secondary">
              {t("intro")}
            </p>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-accent">
              {t("draftNotice")}
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
            className="font-mono text-xs uppercase tracking-widest text-text-secondary underline decoration-accent/60 hover:text-accent"
          >
            {t("backLink")}
          </Link>
        </Card>
      </div>
    </main>
  );
}
