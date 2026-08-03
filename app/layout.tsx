import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
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
};

// Declares this as a deliberately dark-themed page, so browsers with
// automatic "force dark" page inversion (common on Windows/Android) don't
// try to re-invert our own colors — which was turning the light "paper"
// cards (Stel-een-vraag, Aanwijzingen, Verhoor) into near-white-on-white.
export const viewport: Viewport = {
  colorScheme: "dark",
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
        {children}
      </body>
    </html>
  );
}
