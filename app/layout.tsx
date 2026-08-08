import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
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

export const metadata: Metadata = {
  title: "Online Riddles",
  description:
    "Een lateral thinking puzzelspel voor groepen. Stel ja/nee-vragen, verzamel aanwijzingen en ontrafel het mysterie.",
  icons: {
    icon: "/icons/192",
    apple: "/icons/180",
  },
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${fraunces.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-bg-primary"
        >
          Naar hoofdinhoud
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
