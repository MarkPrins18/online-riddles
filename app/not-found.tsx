import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";

// No explicit `robots` here — Next.js already injects `noindex` on any
// 404-status response (including this one) automatically.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound");
  return {
    title: t("title"),
    description: t("description"),
  };
}

// Renders for any unmatched URL (and wherever notFound() is thrown). Kept
// inside the root layout — unlike global-error.tsx there's no crash here,
// so next-intl's provider and normal styling are still available.
export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main id="main-content" className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
      <Card tone="case" className="max-w-lg text-center">
        <h1 className="font-display text-4xl uppercase leading-none text-accent">{t("title")}</h1>
        <p className="mt-3 text-base text-text-primary/90">{t("description")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg border-2 border-accent bg-accent px-5 py-2.5 font-display text-lg uppercase tracking-wide text-ink transition-colors hover:bg-accent-muted"
        >
          {t("home")}
        </Link>
      </Card>
    </main>
  );
}
