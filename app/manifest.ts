import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/** Lets people add the site to their home screen and reopen it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} – photos and documents for any online form`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#1d4ed8",
    lang: "en-IN",
    categories: ["utilities", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
