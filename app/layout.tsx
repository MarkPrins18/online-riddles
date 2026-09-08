import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { CookieNoticeBanner } from "@/components/CookieNoticeBanner";
import { Link } from "@/i18n/navigation";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("RootLayout");
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: title,
      template: `%s — ${title}`,
    },
    description,
    // Deliberately no blanket `alternates.canonical` or `robots` default
    // here: both are inherited by any page that doesn't set its own (Next
    // merges metadata down the tree), so a fixed "/" canonical or
    // "index, follow" here would silently leak onto pages that need
    // something else — /room/[code] (no canonical of its own to give),
    // or app/not-found.tsx (Next already injects `noindex` for any
    // 404-status page; an inherited "index, follow" here would
    // contradict that). Pages that need a canonical or a non-default
    // robots value set their own (see /privacy, /profile, /community/*).
    icons: {
      icon: "/icons/192",
      apple: "/icons/180",
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: title,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// WebSite structured data — a light, always-correct entity signal for
// search engines (name + canonical URL). Kept separate from the JSON-LD on
// dynamic pages (e.g. community pack pages), which describe the specific
// content of that page instead.
function websiteJsonLd(siteUrl: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url: siteUrl,
  };
}

// Declares this as a deliberately dark-themed page, so browsers with
// automatic "force dark" page inversion (common on Windows/Android) don't
// try to re-invert our own colors — which was turning the light "paper"
// cards (Stel-een-vraag, Aanwijzingen, Verhoor) into near-white-on-white.
// themeColor tints the browser/OS chrome (status bar, task switcher) to
// match when installed as a PWA.
export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#241a10",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = await getTranslations("RootLayout");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              websiteJsonLd(siteUrl, t("title"), t("description"))
            ).replace(/</g, "\\u003c"),
          }}
        />
        <NextIntlClientProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-bg-primary"
          >
            {t("skipToContent")}
          </a>
          {children}
          <footer className="px-6 py-6 text-center font-mono text-xs uppercase tracking-widest text-text-secondary">
            <Link href="/privacy" className="underline decoration-accent/60 hover:text-accent">
              {t("privacyLink")}
            </Link>
          </footer>
          <ServiceWorkerRegister />
          <CookieNoticeBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
