import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DetectiveNights",
    short_name: "DetectiveNights",
    description:
      "A lateral thinking puzzle game for groups. Ask yes/no questions, gather clues, and crack the mystery.",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
