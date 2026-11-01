/**
 * Brand and site settings. The name is a placeholder: the repository had no
 * brand when this project was created. Set NEXT_PUBLIC_SITE_NAME to change it.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "DocPrep",
  tagline: "Photos and documents ready for any online form",
  description:
    "Free tools to resize, compress, crop and convert photos and PDFs for any online form — exam and job applications, bank KYC, passport and visa, admissions and more. Files are processed in your browser and are not uploaded.",
  url: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
} as const;
