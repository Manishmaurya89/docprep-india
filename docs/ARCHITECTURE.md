# Architecture

## 1. Starting point

The repository was empty (no Git history, no files). The project was
initialised from scratch with the stack below. No existing code needed to be
preserved.

## 2. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5.9 | TypeScript 7 (native port) was avoided because Next's build-time type check relies on the JS compiler API. |
| Styling | Tailwind CSS 4, CSS custom properties for theme tokens | System font stack: no web-font download, fast on slow connections. |
| PDF editing | `pdf-lib` 1.17.1 (MIT) | Stable but unmaintained upstream since 2021; acceptable because it is pure JS with no network or eval. Does not support encryption — encrypted PDFs are rejected with a clear message. |
| PDF rendering | `pdfjs-dist` 6.x (Apache-2.0) | Lazy-loaded only on PDF pages. Worker file served from our own origin (`public/vendor/pdfjs/`, copied by `scripts/copy-pdf-worker.mjs`). |
| ZIP | `fflate` (MIT, ~8 kB for zip) | Used for "download all". |
| Schema validation | `zod` 4 | Validates every exam requirement record at load and in unit tests. |
| Image processing | Browser Canvas / `OffscreenCanvas` in a Web Worker | No third-party image library. Falls back to the main thread when workers or `OffscreenCanvas` are unavailable. |
| Tests | Vitest (unit, Node), Playwright + axe-core (E2E, accessibility) | E2E runs against the production build. |

No backend, database, authentication or cloud storage exists. No API routes
exist.

## 3. Directory layout

```
app/                        Routes, layouts, metadata
  page.tsx                  Home: search, quick tasks, exam prep, categories, privacy
  tools/                    One route per tool (thin wrappers around features/)
  exam/                     Guided government application preparation
  privacy/                  Privacy disclosure generated from the tool registry
components/
  ui/                       Design system: Button, Card, Alert, Dialog, Field, Slider, Tooltip, ...
  illustrations/            Original inline SVG pictures (hero, steps, privacy flow, documents, tools)
  layout/                   Header (with privacy chip), footer, trust strip, tool search
  workspace/                File dropzone, result panel, stats, download controls
features/
  image-tools/              Resize, compress, crop/rotate, convert, photo & signature UIs
  pdf-tools/                Merge, split, organise, compress, images→PDF UIs, thumbnails
  exam-preparation/         Selection flow, document preparation cards, checklist
lib/
  file-processing/          Framework-independent processing and validation
    detect.ts               Magic-byte format detection
    image-metadata.ts       Header parsing (dimensions, alpha, DPI, EXIF orientation)
    inspect.ts              Validation of user-selected files (size, type, decodability)
    size-limits.ts          Conservative KB → bytes interpretation
    image/                  Geometry, crop interaction, quality search, canvas pipeline,
                            job runner, worker protocol and session (with fallback)
    pdf/                    pdf-lib operations, page ranges, compression, PDF.js loader, rasterise
    errors.ts               Typed ProcessingError with user-facing messages
    limits.ts               File size / pixel limits
    download.ts, zip.ts, filenames.ts, object-urls.ts
  privacy/disclosures.ts    Processing-location labels, browser storage and network lists
  security/csp.ts           Page CSP (nonce) and worker CSP builders
  tools/registry.ts         Tool catalogue (slug, category, keywords, processing location)
data/exam-requirements/
  constants.ts              Status and document-type constants (no zod, safe for client bundles)
  schema.ts                 zod schema for records
  organizations.ts, records/*.ts, index.ts (validated registry)
workers/image.worker.ts     CPU-heavy image work (decode, transform, encode, size search)
tests/unit, tests/e2e       Vitest and Playwright suites; fixtures are generated at test time
```

## 4. Processing model

All processing functions live in `lib/file-processing` and take/return plain
data (`Blob`, `Uint8Array`, option objects). React components only gather
options, call these functions, and render results. This keeps logic testable
in Node (PDF operations, maths, parsing, validation) and in the browser via
Playwright (canvas encoding).

### 4.1 Images

```
File ──► detectFormat(bytes)          reject anything not JPEG/PNG/WebP
     ──► readImageMetadata(bytes)     dimensions, alpha, DPI from headers
     ──► ImageJob (ops)               rotate → flip → crop → resize/fit → background → adjust
     ──► worker (OffscreenCanvas)     or main-thread canvas fallback
     ──► encode(format, quality)      convertToBlob / toBlob
     ──► verify output                re-detect format, re-read dimensions, measure bytes
```

- **Target-size compression** (`image/quality-search.ts`) is a pure function
  that receives an `encode(quality, scale)` callback. It binary-searches the
  highest quality whose output fits the maximum, then (if allowed) reduces
  scale. It returns the best result plus a status: `met`, `below-minimum`,
  or `unreachable` with the smallest output produced. Unit tests drive it with
  deterministic fake encoders; E2E tests drive it with real canvas encoders.
- **No stretching.** Geometry helpers only ever scale uniformly. Fixed output
  sizes are achieved by cropping to the target aspect ratio (photos) or
  padding with a background colour (signatures/documents).
- **Large images** above the canvas safety limit (16.7 MP, the iOS Safari
  ceiling) are decoded at a reduced size via `createImageBitmap` resize
  options, and the UI says so.
- **Cancellation and staleness.** Each job has an `AbortSignal`; the worker
  client terminates the worker on abort. `useProcessingJob` tags each run with
  a sequence number and drops results from superseded runs.

### 4.2 PDFs

- pdf-lib performs merge, split, extract, reorder, rotate, delete and
  image→PDF. Pages are copied with `copyPages`, which preserves content,
  annotations and page boxes.
- PDF.js renders thumbnails/previews locally. It is dynamically imported so
  it is not in any initial bundle.
- **Compression** (`pdf/compress.ts`):
  1. *Structural*: re-save with object streams.
  2. *Image recompression*: find `DCTDecode` image XObjects with DeviceRGB or
     DeviceGray colour spaces, re-encode them with a lower JPEG quality and an
     optional maximum pixel size, and replace a stream only when the new one
     is smaller. Text, vectors and links are untouched.
  3. *Rasterise* (opt-in): render each page to JPEG with PDF.js and rebuild.
     Text becomes non-selectable; the UI states this before running.
  The result reports actual sizes. If the output is not smaller, the UI says
  so and recommends keeping the original.

### 4.3 Government application preparation

- `data/exam-requirements/schema.ts` defines `ApplicationSpec` and
  `DocumentRequirement`. Every record carries `source`, `notificationDate`,
  `applicationWindow`, `lastVerified` and `verificationStatus` (`verified`,
  `source-cited`, `unverified`, `example`; `user-entered` for in-browser
  custom presets). Documents are `image`, `pdf` or `live-capture` (taken
  inside the portal; nothing to prepare) and can record "preferred" pixel
  sizes, exclusive limits ("less than"), approximate physical sizes, A4 page
  size and `specificationGaps` where the source is silent or inconsistent.
- `features/exam-preparation/prepare-image.ts` and `prepare-pdf.ts`
  orchestrate preparation: crop/fit plan → target-size job (enlarging
  proportionally for "preferred" sizes that miss a minimum) or images → A4
  PDF → compression ladder (image recompression, then rasterising), then
  measurement of the produced bytes.
- `features/exam-preparation/validate.ts` compares a produced file's measured
  metadata to a `DocumentRequirement` and returns findings with status `pass`,
  `fail`, or `manual` (cannot be verified automatically).
- `features/exam-preparation/spec-status.ts` derives warnings: missing source,
  unreviewed, example, or stale (`lastVerified` older than 365 days).
- The custom preset path builds an `ApplicationSpec` in memory from user input
  with status `user-entered`; it is never written to the registry.

## 5. Rendering and security headers

`proxy.ts` (Next 16's replacement for middleware) generates a per-request CSP
nonce. This makes pages dynamically rendered, which is an accepted trade-off
for a strict `script-src`. Static scripts (`/_next/static`, `/vendor`) get a
fixed worker policy from `next.config.ts`, because a Web Worker is governed
by the CSP sent with its own script. Static headers also add
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, `X-Frame-Options`, and HSTS in production. See
`SECURITY.md`.

### 5.1 Languages (English and Hindi)

- English is served at the existing URLs, Hindi under `/hi/…`. The language
  comes only from the URL: `proxy.ts` sets an `x-locale` request header from
  the path so the root layout can render `<html lang="hi-IN">`, and the client
  `I18nProvider` (`lib/i18n/client.tsx`) derives it from `usePathname()`.
  Nothing is stored. The header's language switch is a plain link to the same
  page in the other language (presets in the query string are kept).
- Text lives in typed dictionaries: `lib/i18n/en.ts` defines the shape and
  `lib/i18n/hi.ts` must match it (TypeScript, plus `tests/unit/i18n.test.ts`).
  `enUi`/`hiUi` hold text client components need (shipped to the browser);
  `enPages`/`hiPages` hold page text, titles and descriptions (server only).
  Strings may contain `[label](/path)`, `**bold**` and `` `code` ``, rendered
  by `components/ui/RichText.tsx` with links pointing to the same language.
- Pages are written once in `app/_views/` (a private folder) and take a
  `locale`; `app/…/page.tsx` and `app/hi/…/page.tsx` only choose the language.
- Errors carry a message key (`detail("pageMissing", { page })` in
  `lib/file-processing/errors.ts`), so messages from the worker can be shown
  in either language with `errorText(error, t.errors)`. English text for the
  processing layer stays next to its code (`ERROR_TEXT`, `FORMAT_TEXT`,
  `TARGET_TEXT`) so the image worker imports no dictionaries.
- Official values from the requirement records (exam names, notification
  titles, conditions, source references) are never translated.
- `lib/seo.ts` adds `hreflang` alternates (`en-IN`, `hi-IN`, `x-default`) and
  `app/sitemap.ts` lists both languages. `/exam/verify` is English-only.
- Fonts are system fonts; `globals.css` lists the Devanagari faces that ship
  with Windows, macOS/iOS and Android, so no font is downloaded.

## 6. State and storage

- Files live only in memory (`File`/`Blob` objects and object URLs). Object
  URLs are revoked when replaced or unmounted (`useObjectUrl`).
- Nothing is written to browser storage (the site has a single light theme,
  so there is no preference to remember).
- No cookies, analytics, or third-party requests.

## 7. Illustrations and motion

Pictures are inline SVG components (`components/illustrations`), so they add
no network requests and work under the strict CSP. Scroll-linked motion uses
CSS scroll-driven animations (`.scroll-rise`, `.float-*`, `.scroll-spin`,
`.slide-x` in `globals.css`): only transforms are animated (text is never
faded), everything is inside `prefers-reduced-motion: no-preference`, and
browsers without scroll-driven animations simply show still pictures.

## 8. Performance

- Heavy libraries (`pdf-lib`, `pdfjs-dist`, `fflate`) are imported dynamically
  inside the functions that need them. Measured on the production build, no
  page loads pdf-lib or PDF.js until a PDF is processed; zod loads only on the
  custom-preset pages that validate user input (see `TEST_REPORT.md`).
- Image work runs in a module worker to keep the UI responsive.
- Home and tool pages ship only their own client components.

## 9. Extension points

- **New tool**: add processing in `lib/file-processing`, UI in `features/`, a
  view in `app/_views/tools.tsx` with routes in `app/tools/` and
  `app/hi/tools/`, its text in both dictionaries (`tools`, `notes`,
  `seo.toolTitles`), and a registry entry (which also updates search, the
  home page and the privacy disclosure).
- **New language**: add a dictionary typed like `lib/i18n/hi.ts`, register it
  in `lib/i18n/config.ts`, `index.ts` and `client.tsx`, and add route files
  under its prefix.
- **New exam requirement**: add a record under `data/exam-requirements/records`
  following `docs/MAINTAINING_REQUIREMENTS.md`. Unit tests validate all records.
- **Server-side processing (future)**: must declare `processing: "server"` in
  the registry so the privacy page and the tool page disclose it, and must
  follow `SECURITY.md` §4.
