# Product Requirements

## 1. Summary

A free document preparation platform for people filling in Indian online
applications (government jobs, competitive examinations, banking and railway
recruitment) and anyone who needs everyday image and PDF utilities.

The differentiator: **users should not have to work out pixel dimensions,
KB limits, formats or compression settings themselves**, and **their files
should not leave their device** whenever that is technically possible.

The repository was empty when work started, so there was no existing brand.
The product uses a configurable placeholder name, `DocPrep`, set through
`NEXT_PUBLIC_SITE_NAME` (see `lib/site-config.ts`). It is not a registered or
final brand.

## 2. Users and their problems

| User | Problem today | What they need |
| --- | --- | --- |
| Exam / job applicant (primary) | Portals reject uploads ("photo must be 20–50 KB, 200×230 px, JPG"). Applicants guess, use several ad-heavy sites, and upload ID documents to unknown servers. | One place that knows the requirement, prepares the file, and proves the output passes before they upload it. |
| Applicant on a phone with a slow connection | Heavy pages, server round trips per edit. | Lightweight pages, local processing, no uploads. |
| General user | Needs to resize, compress, convert, merge or split occasionally. | Simple, honest tools with no sign-up. |

## 3. Goals

1. Prepare application-ready photos, signatures and scanned documents with
   correct dimensions, formats and size limits.
2. Process every supported file in the browser. No file upload endpoint exists
   in the first release.
3. Never present an unverified or example requirement as official.
4. Report actual output measurements (bytes, pixels, format detected from the
   output bytes) — never claimed or estimated values.
5. Work well on mobile, with keyboard only, and with screen readers.

## 4. Non-goals (first release)

- Accounts, sign-in, cloud storage, or history of processed files.
- Office document (DOCX/XLSX/PPTX) conversion. It needs a server-side engine
  or a large WebAssembly build; it will not be shown until it exists and is
  tested.
- Automatic background removal or face detection for photos.
- Scraping recruitment websites. The requirements registry is maintained by
  hand with citations.
- OCR.

## 5. Functional requirements

### 5.1 Image tools

| ID | Requirement |
| --- | --- |
| IMG-1 | Resize by width/height in pixels, with aspect-ratio lock and percentage scaling. Show resulting dimensions before processing. Do not upscale unless the user opts in. |
| IMG-2 | Compress to a target size (KB or MB). Iteratively adjust encoder quality; optionally reduce dimensions. Show original size, output size, dimensions and % reduction. If the target cannot be reached, say so and offer the smallest result produced. |
| IMG-3 | Crop (freeform and common aspect ratios) and rotate (90° steps, flip). Reset action. Before/after preview. |
| IMG-4 | Convert between JPEG, PNG and WebP by re-encoding. Detect the input format from file content. Warn when transparency will be flattened (JPEG). Report when the browser cannot encode a format (e.g. WebP on some Safari versions) instead of silently producing another format. |
| IMG-5 | Photo / signature preparation with exact dimensions, min/max size, format, fit mode (crop vs. pad), background colour and a final validation report. Never stretch non-uniformly. The original is never modified. |

### 5.2 PDF tools

| ID | Requirement |
| --- | --- |
| PDF-1 | Compress PDF with a real strategy (structural re-save + JPEG image recompression; optional page rasterisation with clear warnings). Report actual result; never promise reduction. |
| PDF-2 | Merge multiple PDFs in a user-controlled order. |
| PDF-3 | Split by page ranges (one file per range) or every N pages. |
| PDF-4 | Extract selected pages into one PDF. |
| PDF-5 | Reorder, rotate and delete pages with thumbnails. |
| PDF-6 | Convert images (JPEG/PNG/WebP) into a PDF with page size and margin options. |
| PDF-7 | Preview pages (PDF.js, rendered locally). |
| PDF-8 | Show page counts, original/output size; clear errors for encrypted, malformed and oversized files. |

### 5.3 Government application preparation

| ID | Requirement |
| --- | --- |
| GOV-1 | Guided flow: organisation → examination → notification/recruitment cycle. |
| GOV-2 | For the selected notification, list required documents with format, dimensions, size limits and other conditions, each with source citation. |
| GOV-3 | Prepare each document locally using those settings. |
| GOV-4 | Validate the actual output against the requirement; checklist of passed / failed / not-verifiable items. |
| GOV-5 | Individual downloads plus one ZIP of all prepared files. |
| GOV-6 | Requirements are structured, schema-validated records with organisation, exam, cycle, notification identifier, document type, formats, size, pixels, physical dimensions, other conditions, source URL, notification date, last verification date and verification status. |
| GOV-7 | Verified, source-cited-but-unreviewed, user-entered and example presets are visually distinct. A warning appears when the source is missing, outdated or not confirmed. |
| GOV-8 | A custom preset path lets users enter the requirements from their own notification. |

### 5.4 Cross-cutting

- Home page: search, quick tasks, government preparation section, categories,
  privacy explanation. The headline speaks to *any* online form (not only
  exams), with picture cards for exam and job forms, bank accounts and KYC,
  passport and visa, admissions, insurance claims and office work. Those cards
  link to general tools and make no claims about any organisation's limits.
- Privacy page that is generated from the same tool registry that declares
  where each tool processes files, so disclosures cannot drift from behaviour.
- Light theme only. Dark mode was removed at the product owner's request
  (it made the site look generic and auto-generated).
- Picture-led pages: most users judge a page by its images before reading,
  so each tool, document type and the privacy promise has an illustration,
  and the privacy promise is visible on every tool page (not only in text).
  Illustrations are original inline SVG; a few parts drift gently while
  scrolling, and stay still when the device asks for reduced motion.
- Actionable error messages for every failure listed in §6.

## 6. Error and edge cases that must be handled

No file selected · unsupported format · corrupted/malformed input · file over
the configured limit · unreachable compression target · invalid dimensions ·
memory exhaustion / canvas failure · worker initialisation failure (fallback
to main thread) · PDF page-range errors · encrypted PDFs · invalid or
unavailable exam specifications · user cancellation · download failure ·
stale results when the user changes the file during processing · duplicate
submissions.

## 7. Success criteria

Matches `IMPLEMENTATION_PLAN.md` §Completion: production build passes, lint
and type check pass, unit and E2E suites pass, outputs are verified by
re-reading the produced bytes, unverified requirements are visibly flagged,
and the privacy page matches actual behaviour.

## 8. Assumptions

- **KB means ambiguous units.** Recruitment portals rarely state whether 1 KB
  is 1,000 or 1,024 bytes. Validation uses the conservative bound for each
  limit: maximum limits are checked against 1,000 bytes per KB and minimum
  limits against 1,024 bytes per KB, so a passing file passes under either
  interpretation. This is shown to the user.
- **Physical dimensions** (e.g. 3.5 cm × 4.5 cm) depend on DPI metadata that
  portals generally do not check. They are displayed and reported as "not
  verifiable automatically" unless a pixel requirement is also given.
- Visual conditions (background colour, face coverage, ink colour, no
  spectacles glare, etc.) cannot be verified automatically and are always
  reported as manual checks.
- Supported image inputs are JPEG, PNG and WebP. Other formats (HEIC, TIFF,
  GIF, BMP) are not offered because browser decoding is inconsistent.
- **"Preferred" dimensions.** IBPS and SBI mark pixel sizes as "preferred"
  while enforcing KB ranges. The tool produces the preferred size; if that
  cannot reach the minimum KB, it enlarges the image proportionally and the
  report says so ("check yourself"), instead of failing a file the portal
  would accept or padding it with junk data.
- **Live-capture photos.** SSC, RRB, UPSC, IBPS and SBI capture a live photo
  inside their portals. These appear in the checklist as "in the application
  form" so candidates know, but nothing is prepared for them.
- **Source gaps.** Where a notice does not publish a limit (UPSC's notice
  defers to a separate instruction page) or contradicts itself (SSC gives
  6.0 × 2.0 cm and 4.0 × 2.0 cm for the signature), the record states the gap
  rather than filling it from unofficial sites.
