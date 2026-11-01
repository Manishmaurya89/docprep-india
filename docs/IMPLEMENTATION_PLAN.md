# Implementation Plan and Status

Status values: **done** (implemented and covered by tests), **partial**,
**not started**. Last updated 2026-10-29. Test evidence: `docs/TEST_REPORT.md`.

## Phase 1 — Inspection and baseline — done

- Repository was an empty directory (not a Git repository, no package files).
  Nothing existed to preserve.
- Initialised Next.js 16.4 / React 19.3 / TypeScript 5.9 / Tailwind 4.3,
  ESLint 9 flat config, Vitest 4, Playwright 1.64.
- Wrote PRODUCT_REQUIREMENTS, ARCHITECTURE, SECURITY and this plan before the
  main implementation.

## Phase 2 — Shared UI and workspace — done

- Design tokens for a single light theme (WCAG AA contrast, checked by axe),
  system font stack, visible focus rings, reduced-motion support. Dark mode
  was built first and later removed at the product owner's request.
- Picture-led redesign: original SVG illustrations for the hero, "how it
  works", the privacy flow, every document type and every tool; a trust
  strip of visual promises; a green privacy banner on every tool page; gentle
  scroll-linked motion (off for reduced-motion users).
- Components: Button / IconButton / ButtonLink, Card, Alert, Badge, Dialog
  (native `<dialog>`), TextField, SelectField, Checkbox, SegmentedControl,
  Slider, InfoTip, ProgressBar / Spinner, Toast region, icon set.
- Layout: sticky header with mobile menu and privacy chip, skip link,
  footer, page header with breadcrumbs.
- Workspace: file dropzone (native input kept accessible), selected-file bar,
  reorderable list with announcements, result statistics, download button
  with failure toast, processing indicator with cancel, error presentation.
- Tool registry drives search, home page, tools index and privacy page.

## Phase 3 — Image tools — done

- Magic-byte detection; JPEG/PNG/WebP header parsing (dimensions, alpha, DPI,
  EXIF orientation).
- Geometry (resize, aspect lock, percentage, no-upscale, crop maths,
  cover/contain without stretching); crop interaction maths (mouse, touch,
  keyboard).
- One canvas pipeline for worker and main thread; multi-step downscaling;
  large images decoded at reduced size within the iOS canvas limit.
- Worker session with cancellation (termination) and automatic main-thread
  fallback (covered by tests for "no Worker" and "worker script fails").
- Target-size search (binary search on quality, optional dimension
  reduction, honest `unreachable` / `below-minimum` statuses).
- Tools: resize, compress, crop & rotate, convert, photo & signature maker.

## Phase 4 — PDF tools — done

- pdf-lib operations: merge, split (ranges / every N), extract, organise
  (reorder / rotate / delete), images → PDF, fit pages to A4. Every output is
  re-parsed and its page count checked.
- Compression: structural (Flate for uncompressed streams + object streams),
  JPEG image recompression in the worker (only replaced when smaller),
  optional rasterisation via PDF.js with explicit warnings.
- PDF.js thumbnails rendered lazily (IntersectionObserver), worker and
  assets served from our origin.
- Page arranger for images → PDF (and photos of certificate pages): each
  image previewed on its page with the same layout maths as the PDF writer;
  drag with mouse or finger, keyboard, buttons; per-page rotation.
- Encrypted, malformed, truncated and non-PDF inputs produce specific errors.

## Phase 5 — Government application preparation — done (data partial)

- zod schema with verification statuses, application windows, "preferred"
  pixels, exclusive limits, approximate physical sizes, A4 page size,
  live-capture items and explicit `specificationGaps`.
- Records transcribed from official documents (see
  `docs/MAINTAINING_REQUIREMENTS.md`): IBPS PO/MT-XVI, SBI JA 2026, SBI PO
  2025, SSC CGL 2026, SSC CHSL 2026, UPSC CSE 2026 (notice only), RRB CEN
  06/2025, plus one labelled example preset.
- Flow: organisation → examination/notification → per-document preparation
  (crop/fit/background/clean-up for images; PDF or photos → A4 PDF with a
  compression ladder for PDFs) → checklist → ZIP.
- Custom presets (`/exam/custom`, `/tools/photo-signature`) validated with
  the same schema and marked "entered by you".
- **Partial:** no record is `verified` yet (needs a second reviewer); UPSC
  technical limits are not recorded (source not retrievable).

## Phase 6 — Privacy, security, failure handling — done

- Per-request nonce CSP (`proxy.ts`) with `connect-src 'self'`; static CSP
  on worker scripts; security headers; no cookies, analytics or third-party
  requests (asserted by E2E tests).
- Privacy page generated from the tool registry and disclosure lists.
- Error taxonomy with actionable messages for every case in PRD §6;
  cancellation; stale-result protection; duplicate-submission protection
  (buttons disabled while running, new runs abort old ones).

## Phase 7 — Verification — done

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
`npm run test:e2e` (Chromium desktop, Chromium Pixel 7, WebKit iPhone 14),
`npm audit`. Results in `docs/TEST_REPORT.md`.

## Known limitations

| Area | Limitation |
| --- | --- |
| Requirements | All official records are `source-cited`, not `verified`. UPSC limits missing. Newer cycles (e.g. SBI PO 2026-27) not yet added. Requirements can change with corrigenda. |
| Photos | No automatic background removal, face detection or face-coverage check; these are manual checks. Live-capture photos (SSC, RRB, UPSC, IBPS, SBI) cannot be prepared in advance. |
| Minimum sizes | If an exact (non-"preferred") size cannot reach a minimum KB at full quality, the result is reported as failing. The tool does not pad files with metadata to inflate their size. |
| Formats | HEIC/HEIF, TIFF, GIF and BMP inputs are rejected with guidance. WebP output depends on the browser (disabled where unsupported). |
| PDF | Password-protected PDFs cannot be edited (pdf-lib has no decryption). Merging/organising drops bookmarks and form fields. Image recompression skips CMYK, JPEG 2000, JBIG2 and lossless images; rasterising handles anything but removes text selectability. |
| Memory | Very large files can still exhaust memory on low-end phones; failures are caught and reported. |
| Office documents | DOCX/XLSX/PPTX conversion is not implemented and not shown. |
| Rendering | Pages render per request (needed for CSP nonces); no static export. |
| Browsers tested | Chromium and WebKit (Playwright builds). Firefox could not be launched in the test environment, so it is untested; real iOS/Android devices were not tested. |
| Localisation | English only. |
