# DocPrep — privacy-first document preparation

Free tools for preparing photos, signatures, scans and PDFs for Indian online
applications (SSC, UPSC, IBPS, SBI, RRB and others), plus everyday image and
PDF utilities. **Every tool processes files in the browser; no file is
uploaded.**

> "DocPrep" is a placeholder brand. Set `NEXT_PUBLIC_SITE_NAME` to change it.

## What it does

| Area | Tools |
| --- | --- |
| Application preparation | Guided flow: organisation → examination → notification → each required document prepared and checked (pass / fail / check-yourself), individual downloads or one ZIP. Custom presets for any other notification. |
| Image tools | Resize (pixels or %, aspect lock, no upscaling by default) · Compress to a target size (iterative, measured) · Crop & rotate (freeform or fixed ratio, keyboard and touch) · Convert JPEG/PNG/WebP (re-encoding, transparency warning) · Photo & signature maker (exact size, KB range, validation report) |
| PDF tools | Merge · Split by ranges / every N pages · Extract pages · Reorder, rotate, delete with previews · Compress (structural, image recompression, or rasterise) · Images to PDF · PDF to JPG/PNG (also password-protected PDFs such as e-Aadhaar) |

Requirement presets live in a structured, schema-validated registry with
official source links and verification status. See
[docs/MAINTAINING_REQUIREMENTS.md](docs/MAINTAINING_REQUIREMENTS.md).

## Quick start

Requirements: Node.js 22.13 or newer (developed on Node 24), npm.

```bash
npm install
```

`npm install` also copies the PDF.js worker, fonts and decoders into
`public/vendor/pdfjs/` (see `scripts/copy-pdf-worker.mjs`) so they are served
from this site's own origin.

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack). |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest unit tests (Node). |
| `npm run test:e2e` | Playwright end-to-end tests against the production build (port 3100). Run `npm run build` first. |
| `npm run check` | lint + typecheck + unit tests + build. |
| `npm run brand-assets` | Regenerates the share image and app icons from the running site (after changing the brand). |
| `npm run samples` | Writes synthetic test files (photos, signatures, scans, broken and locked PDFs) to `sample-files/`. |

End-to-end tests need the browsers once:

```bash
npx playwright install chromium webkit
```

Projects: `desktop-chromium` (all specs), `mobile-chromium` (Pixel 7:
accessibility and responsive specs), `mobile-webkit` (iPhone 14: core
journeys). Run one with `npx playwright test --project=mobile-webkit`.
Firefox is opt-in: `npx playwright install firefox`, then
`E2E_FIREFOX=1 npx playwright test --project=desktop-firefox`.

## Environment variables

All optional; none are secret. See `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_NAME` | `DocPrep` | Brand name in the header, titles and metadata. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical origin for metadata. |

## Deployment

Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Vercel, Docker, post-deploy checks, search
engines). Launch and growth plan: [docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md).

The app must run as a Node.js server (or a platform that runs Next.js
`proxy.ts`, such as Vercel). **Static export is not supported**: each page
gets a per-request Content Security Policy nonce, which needs server
rendering.

```bash
npm ci
npm run build
NODE_ENV=production npm start -- --port 3000
```

Checklist for production:

1. Serve over HTTPS only (a reverse proxy such as Nginx or a platform load
   balancer). The app sends `Strict-Transport-Security` and
   `upgrade-insecure-requests` in production.
2. Make sure the proxy passes the app's response headers through unchanged
   (especially `Content-Security-Policy`).
3. Set `NEXT_PUBLIC_SITE_NAME` and `NEXT_PUBLIC_SITE_URL` before building.
4. Publish a security contact (see `docs/SECURITY.md` §7).
5. Before each release: `npm run check`, `npm run test:e2e`, `npm audit`.

No database, object storage, secrets or background jobs are needed.

## Project layout

```
app/                       routes (home, tools, exam, privacy)
components/ui|layout|workspace   design system, layout, file workspace
features/image-tools|pdf-tools|exam-preparation   tool UIs and orchestration
lib/file-processing        framework-independent processing and validation
lib/privacy, lib/security, lib/tools   disclosures, CSP, tool registry
data/exam-requirements     sourced requirement records + zod schema
workers/image.worker.ts    background image processing
tests/unit, tests/e2e      Vitest and Playwright suites (fixtures generated at test time)
docs/                      requirements, architecture, security, plan, test report
```

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security and privacy](docs/SECURITY.md)
- [Implementation plan and status](docs/IMPLEMENTATION_PLAN.md)
- [Maintaining requirement records](docs/MAINTAINING_REQUIREMENTS.md)
- [Test report](docs/TEST_REPORT.md)
- [Manual test plan](docs/MANUAL_TEST_PLAN.md) — hands-on checks with the sample files, phone testing, data verification

## Important disclaimer

This project is not affiliated with any recruitment body. Requirement records
can contain mistakes and notifications change; the official notification
always takes precedence.
