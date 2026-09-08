import { setRequestLocale } from "next-intl/server";
import { CommunityNav } from "@/components/community/CommunityNav";
import { isLocale } from "@/lib/i18n/locales";

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (isLocale(locale)) setRequestLocale(locale);

  return (
    <main id="main-content" className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <CommunityNav />
        <div className="pt-8">{children}</div>
      </div>
    </main>
  );
}
