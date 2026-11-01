/**
 * Builds the Content-Security-Policy. `connect-src 'self'` is the key privacy
 * control: page scripts cannot send data to any other origin.
 */
export function buildContentSecurityPolicy(options: { nonce: string; isDevelopment: boolean; upgradeInsecure: boolean }): string {
  const { nonce, isDevelopment, upgradeInsecure } = options;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'wasm-unsafe-eval' lets PDF.js run its WebAssembly image decoders; it does not allow JS eval.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "'wasm-unsafe-eval'", ...(isDevelopment ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDevelopment ? ["ws:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (upgradeInsecure) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Policy for static scripts. Browsers ignore CSP on scripts loaded with
 * <script>, but a Web Worker is governed by the policy sent with its own
 * script, so this is what keeps the image and PDF.js workers from contacting
 * other origins.
 */
export function buildWorkerContentSecurityPolicy(options: { isDevelopment: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval'${options.isDevelopment ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self'",
    "img-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
}

/**
 * Whether the page was served over HTTPS, directly or behind a TLS-terminating
 * proxy. Only then is `upgrade-insecure-requests` safe: on plain HTTP (for
 * example a phone testing the app over the local network) it would rewrite
 * every script URL to https:// and break the page.
 */
export function servedOverHttps(protocol: string, forwardedProto: string | null): boolean {
  const forwarded = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  return protocol === "https:" || forwarded === "https";
}
