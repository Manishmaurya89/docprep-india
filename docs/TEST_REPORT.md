# Test Report

Last run on 2026-11-08 (after adding PDF to JPG/PNG) · macOS (Darwin 27, Apple Silicon) · Node.js 24.21.0 ·
npm 11.19.0 · Playwright 1.64.1 (Chromium and WebKit 27.2 builds).

All commands below were run against the final code. Nothing was skipped or
marked as expected-to-fail except the one test noted.

## Summary

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Pass — 0 problems |
| Type check | `npm run typecheck` | Pass — 0 errors |
| Unit tests | `npm test` | **143 passed** (15 files) |
| Production build | `npm run build` | Pass (also as the self-contained Docker server: `NEXT_OUTPUT=standalone`) |
| End-to-end | `npx playwright test` | **212 passed, 3 skipped** |
| Flakiness check | `pdf-to-image` spec, `--repeat-each=3` (Chromium + WebKit) | 42 / 42 passed (earlier: resilience, application-prep and real-content, 54 / 54) |
| Dependency audit | `npm audit --omit=dev` | 0 vulnerabilities in anything shipped. `npm audit` (all) reports 8 moderate advisories in the dev-only lint chain (`minimatch` via `typescript-eslint` / `eslint-config-next`); the only offered fix downgrades `eslint-config-next`, so it waits for an upstream release |

The skipped tests skip themselves by design: the two mobile-menu tests
(English and Hindi) on the desktop project, and the mouse-drag test on the
iPhone project (finger dragging is tested there instead).

## End-to-end coverage

| Project | Device | Passed |
| --- | --- | --- |
| `desktop-chromium` | Desktop Chrome | 105 |
| `mobile-chromium` | Pixel 7 (accessibility, responsive and Hindi specs) | 45 |
| `mobile-webkit` | iPhone 14 (core journeys, real-content paths, page arranging, PDF to JPG/PNG, Hindi) | 62 |

Required journeys:

| Journey | Spec | How the output is verified |
| --- | --- | --- |
| Resize and download an image | `image-tools` | Downloaded bytes parsed: PNG, 400 × 300; worker engine used; no uploads |
| Compress an image to a target size | `image-tools` | Downloaded JPEG ≤ 50,000 bytes; reported size equals file size; limit shown as entered |
| Merge PDFs | `pdf-tools`, `real-content` | Page order of the downloaded PDF follows the user's reordering |
| Split a PDF | `pdf-tools` | Range errors shown; parts and ZIP contents have the right pages |
| Prepare an image with a custom preset | `application-prep` | 200 × 230 JPEG, 20,480–50,000 bytes, all measurable checks pass |
| Warning for an unverified/example requirement | `application-prep` | "Example only" and "No official source" warnings shown |

Real-content paths (`real-content.spec.ts`): JPEG-heavy PDF compressed by
recompressing its images (output < 80% of input, pages intact); a > 600 KB
scanned certificate brought under IBPS's 500 KB limit on A4; a phone photo
stored sideways with EXIF orientation shown and saved upright; transparency
warning and flattened JPEG output; 90° rotation swapping output dimensions; a
genuinely encrypted PDF (Ghostscript, encrypted object streams) reported as
password-protected; the verification sheet listing all 7 official records.

PDF to JPG/PNG (`pdf-to-image.spec.ts`, Chromium and WebKit): every page of
a 3-page PDF to JPG at 150 DPI (pixel size and recorded DPI read from the
downloaded bytes, page content not blank, ZIP names in page order); one
chosen page of a rotated PDF to 300 DPI PNG (landscape output); the genuinely
encrypted Ghostscript PDF opened with its password after a wrong one is
rejected, with no request carrying the password and nothing uploaded; a
size limit met (≤ 150,000 bytes) and an impossible one (1 KB) reported as
missed; PNG offers no size limit; a non-PDF rejected; axe scans of the
password form and results; the Hindi page. Unit tests cover render sizes and
canvas limits, file names, DPI writing for JPEG (existing and missing JFIF)
and PNG (`pHYs` with a valid CRC), and telling "password needed" from "wrong
password".

Sample-file workflows (`sample-files.spec.ts`, runs when `npm run samples`
has been run): every IBPS PO/MT-XVI document prepared from the samples with
0 failed checks and the ZIP containing all five files; RRB signature; upright
phone photo; 12 MP photo under 200 KB; 5 MB album PDF compressed. Observed
values are listed in `MANUAL_TEST_PLAN.md`.

Other E2E coverage: reorder/rotate/delete with previews, extract pages,
honest PDF compression reporting, images → A4 PDF, non-PDF / malformed PDFs,
renamed non-images, HEIC guidance, empty and truncated images, minimum-size
failure reported honestly, organisation → notification flow with sourced
values, UPSC/SSC source gaps, cancellation, stale results after switching
files mid-job, main-thread fallback (no `Worker`; worker script blocked), CSP
and security headers, `upgrade-insecure-requests` only behind HTTPS,
per-request nonce, worker-script CSP, no third-party requests or cookies,
privacy page content, axe WCAG 2.1 A/AA scans of 8 pages (desktop and mobile)
light theme kept even when the system prefers dark, illustrations still under reduced motion, privacy banner on every tool page and the trust strip on the home page, keyboard access (skip link, `/` search, file input,
crop box), and no horizontal overflow on 7 pages.

Page arranging (`arrange-pages.spec.ts`): mouse drag, simulated finger drag
on the grip, keyboard and button reordering, rotation, preview following the
page setup, and the exam certificate built from arranged photos — each
verified from the downloaded PDF's page order.

## Unit test coverage

| File | Covers |
| --- | --- |
| `page-layout.test.ts` | Page layout shared by the PDF writer and the previews (orientation, margins, no stretching); reordering helper |
| `detect.test.ts` | Magic-byte detection, renamed files, truncated headers, HEIC/GIF/BMP/TIFF hints |
| `image-metadata.test.ts` | PNG/JPEG/WebP (VP8, VP8L, VP8X) dimensions, alpha, DPI, EXIF orientation |
| `geometry.test.ts` | Resize, aspect lock, percentage, no-upscale, invalid dimensions, crop/fit planning without stretching |
| `quality-search.test.ts` | Target search: fits, ranges, below-minimum, unreachable, resize fallback, lossless, cancellation |
| `page-ranges.test.ts` | Range parsing and descriptive errors |
| `pdf-operations.test.ts` | Merge order, split, extract, organise, rotation stacking, images → PDF, A4 fitting (incl. rotated and blank pages), encrypted (marker and real Ghostscript file) and malformed input |
| `pdf-compress.test.ts` | Structural re-save, conditional image replacement, cancellation, EXIF-tagged JPEGs left untouched |
| `exam-registry.test.ts` | Every bundled record validates; official https domains; status rules; transcribed values; gaps instead of invented values |
| `exam-validation.test.ts` | Conservative KB checks, preferred dimensions, exclusive limits, A4, manual checks, staleness and closed-window warnings, output planning |
| `privacy-and-security.test.ts` | All tools local; no API routes, server actions or network calls in app code; no browser storage at all; page and worker CSP; HTTPS-only upgrade |
| `utilities.test.ts` | Filename sanitising, formatting, ZIP, object-URL cleanup, error mapping, tool search |

## Launch-readiness checks (2026-10-29)

| Area | Result |
| --- | --- |
| Security headers on pages, 404s and worker scripts | Present (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP) |
| Request methods | `POST`/`PUT`/`PATCH`/`DELETE`/`TRACE` → 405 (tested) |
| Source maps, `X-Powered-By`, image endpoint | Not exposed / disabled |
| Secrets in code, unsafe HTML, server endpoints | None (the only `dangerouslySetInnerHTML` is escaped, static JSON-LD) |
| Dependencies | `npm audit`: 0 vulnerabilities; versions pinned; Dependabot configured |
| Self-contained server (Docker image's runtime) | Built and run locally: pages, size pages, robots, sitemap (40 URLs), manifest, share image, versioned PDF.js all served; unknown size → 404; POST → 405. Docker itself was not run (engine not started). |
| Speed, Pixel 7 on throttled slow 4G (1.6 Mbps, 150 ms) and 4× CPU | First and largest content ≈ 0.6 s, load 1.2–1.4 s, layout shift 0 on home, tool, size and exam pages |
| Data per first visit (compressed) | 174–200 KB |
| Search tags | Every page: title, description, canonical, share image; tool pages: WebApplication + breadcrumb structured data (tested) |

## Defects found and fixed during verification

| Found by | Defect | Fix |
| --- | --- | --- |
| Visual review | Icon buttons' padding classes conflicted, squeezing icons to 8 px | Separate square sizes for icon buttons |
| Code review | Web Workers ran without any CSP (static scripts bypass `proxy.ts`) | Worker policy on `/_next/static` and `/vendor` |
| Phone-testing setup | `upgrade-insecure-requests` would break the app over plain HTTP on a LAN address | Only sent when the page is served over HTTPS |
| Real encrypted sample | Genuinely encrypted PDFs were reported as "damaged" (pdf-lib fails before its own check) | Raw `/Encrypt` detection before parsing; clearer hint for edit-locked PDFs |
| Engine check | Browsers now apply EXIF orientation even with `imageOrientation: "none"`; PDF image recompression could rotate such images | JPEGs with an orientation tag are left untouched |
| Writing the test plan | Compress result said "within your 195.3 KB limit" for a 200 KB target | Limit shown as entered |
| Hands-on testing | File replacement was disabled during processing | Allowed; the running job is cancelled and its result discarded |
| User testing (Images to PDF) | Pages followed the file picker's alphabetical order ("back" before "front") and the plain list gave no visual way to notice or fix it | Page arranger: each image shown on its page exactly as it will print, drag (mouse or finger), keyboard and button reordering, rotation; also used for photos of certificate pages in the exam workflow |
| Launch audit | Pages lost their share image (page-level share fields replaced the inherited one) | Share image named explicitly on every page; tested |
| Launch audit | `TRACE` returned 500 and `POST` returned the page | All non-GET/HEAD requests refused with 405 |
| Launch audit | PDF.js files (2.1 MB worker) re-downloaded or re-checked on every visit | Versioned path with a one-year immutable cache |
| Launch audit | Next.js build telemetry on by default | Disabled in Docker and CI; documented for local machines |
| Redesign review | Hero picture: "No upload" label overlapped the photo card and the download arrow touched its label; task pictures were oversized on phones; on phones the picture sat below the fold | Repositioned; capped picture height; picture placed right after the headline on phones |

## Manual checks performed

- Visual review in the in-app browser: home, application preparation,
  notification workspace (real photo preparation: 200 × 230 px, all
  measurable checks passed), compress tool; the picture-led redesign at desktop and phone widths;
  scroll-linked motion confirmed to move (shield moved from +15 px to −9 px
  between two scroll positions).
- Development server (`npm run dev`): resize ran in the worker; no console
  or server errors.
- JavaScript per page on the production build (uncompressed): 464–535 KB on
  all pages except the custom-preset page (651 KB, includes zod). pdf-lib
  and PDF.js are not loaded until a PDF is processed.
- EXIF orientation behaviour confirmed in Chromium and WebKit
  (`createImageBitmap` and `<img>` agree with the app's header parser).

## Not covered

- **Firefox.** A `desktop-firefox` project exists (`E2E_FIREFOX=1 npx playwright test --project=desktop-firefox`),
  but Playwright's Firefox 157 build could not start in the test environment
  ("Could not find profile folder", also with `TMPDIR` changed), so no test
  reached the app. Behaviour in Firefox is therefore unverified.
- Real iOS / Android devices (Playwright WebKit and device emulation only) —
  see the phone instructions in `MANUAL_TEST_PLAN.md`.
- Screen-reader walkthroughs (automated axe checks and keyboard tests only).
- Very large inputs (files near the 40 MB / 150 MB limits) and low-memory
  devices.
- PDFs with JPEG 2000, JBIG2 or CMYK images, and real scanned certificates
  (test fixtures are generated; no personal documents are used).
- Independent review of the requirement records (use `/exam/verify`).
