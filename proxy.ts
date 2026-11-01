import { type NextRequest, NextResponse } from "next/server";
import { localeFromPath } from "@/lib/i18n/config";
import { buildContentSecurityPolicy, createNonce, servedOverHttps } from "@/lib/security/csp";

const ALLOWED_METHODS = new Set(["GET", "HEAD"]);

export function proxy(request: NextRequest) {
  // Nothing on this site accepts data: refuse any request that could carry a body.
  if (!ALLOWED_METHODS.has(request.method)) {
    return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const nonce = createNonce();
  const isDevelopment = process.env.NODE_ENV === "development";
  const csp = buildContentSecurityPolicy({
    nonce,
    isDevelopment,
    upgradeInsecure: !isDevelopment && servedOverHttps(request.nextUrl.protocol, request.headers.get("x-forwarded-proto")),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // The root layout reads this to set <html lang>; the language comes from the URL only.
  requestHeaders.set("x-locale", localeFromPath(request.nextUrl.pathname));

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|vendor/|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
