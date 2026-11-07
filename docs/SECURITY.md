# Security and Privacy

This document describes what the application does with files, the controls in
place, and what is **not** claimed. It is not a certification, audit or legal
compliance statement.

## 1. Data flow

| Data | Where it goes | Retention |
| --- | --- | --- |
| Selected files (images, PDFs) | Read into browser memory (`File`, `ArrayBuffer`, `ImageBitmap`, canvas). Processed in the page or a same-origin Web Worker. | Until the tab is closed, the file is replaced, or the user clears it. Object URLs are revoked on replace/unmount. |
| Processed outputs | Browser memory; saved to disk only when the user clicks Download. | Same as above. |
| Anything else | Nothing is collected. No analytics, no cookies, no error reporting service. | — |

**No file upload endpoint exists.** The app has no API routes or server
actions (a unit test fails if one is added). Every tool in
`lib/tools/registry.ts` declares `processing: "local"`, and the privacy page
is generated from that list. Unit tests also fail if application code calls
`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` or `EventSource`, or uses
any browser storage (the site stores nothing in the browser). E2E tests record network
traffic during the main journeys and fail if any request leaves the origin or
carries a body, and check that no cookies are set.

## 2. Browser-side controls

### Content Security Policy (`proxy.ts`)

```
default-src 'self';
script-src 'self' 'nonce-<random>' 'strict-dynamic' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests   (production only)
```

- `connect-src 'self'` is the most important privacy control: even if a
  dependency misbehaved, the page cannot send data to another origin with
  `fetch`/XHR/WebSocket/beacon.
- `'wasm-unsafe-eval'` is needed for PDF.js WebAssembly image decoders
  (JPEG 2000, JBIG2). It does not allow JavaScript `eval`.
- `'unsafe-eval'` is added **only in development**, as required by React's
  dev tooling.
- `style-src 'unsafe-inline'` is required for server-rendered `style`
  attributes; style injection is a lower-risk vector and no user content is
  rendered as HTML.

### Worker policy (`next.config.ts`)

A Web Worker is governed by the CSP sent with its own script, not the page's.
Static scripts under `/_next/static/` and `/vendor/` (which include the image
worker and the PDF.js worker) are served with:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self';
img-src 'self' blob: data:; object-src 'none'; base-uri 'none'
```

so workers cannot contact other origins either. An E2E test checks both
worker scripts carry this policy.

### Request methods (`proxy.ts`)

Only `GET` and `HEAD` are accepted for pages. `POST`, `PUT`, `PATCH`,
`DELETE` and `TRACE` get `405 Method Not Allowed`, so the server cannot
receive a file even by mistake. Next.js's image-optimisation endpoint is
disabled (`images.unoptimized`), and Next.js build telemetry is turned off
in the Dockerfile and CI.

### Caching

PDF.js assets are served from a versioned path (`/vendor/pdfjs/<version>/`)
with a one-year immutable cache. HTML is `no-store` (it carries a per-request
nonce).

### Other headers (`next.config.ts`)

`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy` (camera, microphone, geolocation, payment, USB, etc.
disabled), `Cross-Origin-Opener-Policy: same-origin`,
`X-Frame-Options: DENY`, `Strict-Transport-Security` in production, and
`poweredByHeader: false`.

### File handling

- Input type is determined from **magic bytes**, not the extension or the
  browser-reported MIME type.
- Size limits (`lib/file-processing/limits.ts`) are checked before reading.
- Pixel limits guard against decompression bombs and canvas exhaustion.
- File contents are never inserted into the DOM as HTML. Filenames are
  rendered as text and sanitised before use as download names.
- PDF.js runs with scripting disabled (no `enableScripting`), with its worker
  served from our origin. pdf-lib does not execute PDF JavaScript.
- Encrypted PDFs are rejected by the editing tools rather than partially
  processed. The one exception is **PDF to JPG/PNG**: it can open a
  password-protected PDF (for example e-Aadhaar) with a password the user
  types. The password goes only to PDF.js in the same tab (which keeps it
  for the open document), is cleared from the field after each attempt, is
  never stored or put in a URL, and the field has `autocomplete="off"`. An
  E2E test checks that no request contains it.

## 3. Supply chain

| Package | Licence | Why |
| --- | --- | --- |
| next, react, react-dom | MIT | Framework |
| pdf-lib | MIT | PDF editing (pure JS) |
| pdfjs-dist | Apache-2.0 | PDF rendering |
| fflate | MIT | ZIP creation |
| zod | MIT | Schema validation |

Dev-only: typescript, tailwindcss, eslint (+ eslint-config-next), vitest,
@playwright/test, @axe-core/playwright (MPL-2.0, test only).

`npm audit` is run as part of release checks. Versions are pinned exactly in
`package.json`.

## 4. Rules for any future server-side processing

Nothing below is implemented, because no feature currently needs a server.
Any future server feature (for example office-document conversion) must:

1. Declare `processing: "server"` in the tool registry so the tool page and the
   privacy page disclose the upload before the user selects a file.
2. Use HTTPS only; validate magic bytes, MIME type, extension, size and request
   count on the server, independently of the client.
3. Write uploads to a randomised name in a temporary directory outside any
   publicly served path; never use the client filename in a path.
4. Run conversion in an isolated process/container with CPU, memory, time and
   concurrency limits; pass arguments as an array (never through a shell).
5. Delete temporary files in a `finally` block, including on failure and
   timeout.
6. Log only request IDs, sizes and durations — never file content, extracted
   text, personal identifiers or original filenames.
7. Rate-limit the endpoint and add CSRF protection if cookies are ever used.
8. Never fetch user-supplied URLs (SSRF); if unavoidable, use an allow-list.

## 5. Threats considered

| Threat | Mitigation |
| --- | --- |
| Exfiltration of file contents by a script | Strict CSP (`connect-src 'self'`, nonce-based `script-src`), no third-party scripts. |
| XSS via filenames or PDF metadata | Rendered as React text nodes only; no `dangerouslySetInnerHTML` with file data. |
| Malicious/malformed files crashing the tab | Size and pixel limits, header validation, try/catch around decoders, worker isolation. |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options: DENY`. |
| Misleading requirement data causing rejected applications | Verification status on every record, visible warnings, conservative KB interpretation, "manual check" findings for what cannot be measured. |

## 6. Known limitations

- Browser memory is the practical limit for very large PDFs; limits are set
  conservatively but low-memory phones can still fail. Failures are caught and
  reported.
- Processed images are re-encoded by the browser; metadata such as EXIF
  (including GPS location) is **removed** as a side effect. This is a privacy
  benefit but means the output carries no camera metadata. Images to PDF
  embeds upright JPEGs without re-encoding (to keep quality), so their
  metadata segments (EXIF, XMP, IPTC, comments, data after the image) are
  stripped explicitly first (`lib/file-processing/strip-metadata.ts`).
- pdf-lib does not decrypt PDFs; password-protected PDFs cannot be edited.
  They can only be turned into images (PDF to JPG/PNG), which PDF.js renders
  after decrypting them in the browser.
- PDF to JPG/PNG holds all produced images in memory; the total is capped at
  400 MB (`LIMITS.pdfImagesMaxTotalBytes`) and very large pages are rendered
  at a lower DPI to stay within canvas limits (the UI says so).
- Dynamic rendering (needed for CSP nonces) means pages are rendered per
  request rather than served as static HTML.

## 7. Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
<https://github.com/Manishmaurya89/docprep-india/security/advisories/new>.
Do not open a public issue for security problems. The same contact is
published at `/.well-known/security.txt`.
