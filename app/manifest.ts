import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Online Riddles",
    short_name: "Riddles",
    description:
      "Een lateral thinking puzzelspel voor groepen. Stel ja/nee-vragen, verzamel aanwijzingen en ontrafel het mysterie.",
    start_url: "/",
    display: "standalone",
    background_color: "#15120e",
    theme_color: "#241a10",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
