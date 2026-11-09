import type { NextConfig } from "next";
import { buildWorkerContentSecurityPolicy } from "./lib/security/csp";

const isProduction = process.env.NODE_ENV === "production";

/** Static security headers. The Content-Security-Policy is set per request in proxy.ts (it needs a nonce). */
const PERMISSIONS_POLICY = (camera: string) =>
  `camera=${camera}, microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), interest-cohort=(), browsing-topics=()`;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // No page may use the camera, microphone or location, except the camera on the photo background tool (below).
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY("()") },
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

if (isProduction && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn("[config] NEXT_PUBLIC_SITE_URL is not set: canonical links, the sitemap and share previews will point at http://localhost:3000.");
}

const nextConfig: NextConfig = {
  // Docker images use the self-contained server (see Dockerfile); `next start` uses the normal build.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  // The app never uses next/image; turning optimisation off removes the
  // server-side image endpoint entirely.
  images: { unoptimized: true },
  async headers() {
    const workerPolicy = { key: "Content-Security-Policy", value: buildWorkerContentSecurityPolicy({ isDevelopment: !isProduction }) };
    return [
      { source: "/:path*", headers: securityHeaders },
      // The live photo needs the camera, on this page only and only for this site (never in frames or other origins).
      ...["/tools/photo-background", "/hi/tools/photo-background"].map((source) => ({ source, headers: [{ key: "Permissions-Policy", value: PERMISSIONS_POLICY("(self)") }] })),
      // Pages get a per-request nonce policy from proxy.ts; static scripts (including workers) get this one.
      { source: "/_next/static/:path*", headers: [workerPolicy] },
      // Versioned paths (vendor/pdfjs/<version>/…), so a year-long cache is safe.
      { source: "/vendor/:path*", headers: [workerPolicy, { key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
