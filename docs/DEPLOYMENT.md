# Deployment

The site needs a server that runs Next.js 16 (pages get a fresh security
nonce per request). It has no database, no secrets and no file storage, so
hosting is cheap and simple. **Static-only hosting is not supported**
(GitHub Pages, S3 websites, Netlify static export).

## Before the first deploy

1. Choose the brand and domain. Avoid names or logos that could be mistaken
   for a government body (no "sarkari", "gov", emblems).
2. Set the name and address, then regenerate the share image and icons:

   ```bash
   NEXT_PUBLIC_SITE_NAME="YourName" NEXT_PUBLIC_SITE_URL="https://your.domain" npm run build
   ```
   ```bash
   NEXT_PUBLIC_SITE_NAME="YourName" npm start
   ```
   ```bash
   npm run brand-assets
   ```

   Commit the regenerated `app/opengraph-image.png`, `app/apple-icon.png` and
   `public/icons/*`.
3. Turn off Next.js build telemetry on your machine: `npx next telemetry disable`
   (the Dockerfile and CI already set `NEXT_TELEMETRY_DISABLED=1`).
4. Run everything: `npm run check`, then `npx playwright test`.

### Environment variables (none are secret)

| Variable | Example | Needed |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://your.domain` | Yes — used for canonical links, the sitemap and share previews. The build warns if it is missing. |
| `NEXT_PUBLIC_SITE_NAME` | `YourName` | Recommended — defaults to the placeholder "DocPrep". |
| `NEXT_TELEMETRY_DISABLED` | `1` | Recommended. |

These are read at **build** time, so rebuild after changing them.

## Option A — Vercel (fastest to launch)

1. Push the repository to GitHub.
2. In Vercel: **Add New → Project**, import the repository. Framework preset:
   Next.js. No build settings need changing.
3. Add the environment variables above (Production and Preview).
4. Nothing to set for region or framework: `vercel.json` declares the
   Next.js framework and the **Mumbai (bom1)** region, so pages are
   rendered close to Indian users.
5. Add your domain (Settings → Domains) and follow the DNS instructions;
   HTTPS is automatic.
6. Do not enable Vercel Web Analytics or Speed Insights: both add scripts,
   which the privacy page says the site does not have (and the CSP blocks).

Notes: Vercel's Hobby plan is for non-commercial use; use Pro for a
commercial launch. Rollback is one click (Deployments → Promote).

## Option B — Docker on any server or cloud

The `Dockerfile` builds a self-contained server that runs as a non-root
user and includes a health check.

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain --build-arg NEXT_PUBLIC_SITE_NAME=YourName -t docprep:1 .
```
```bash
docker run -d --restart unless-stopped -p 127.0.0.1:3000:3000 --name docprep docprep:1
```

Serve it over HTTPS with a reverse proxy. With [Caddy](https://caddyserver.com)
(automatic certificates), the whole `Caddyfile` is:

```
your.domain {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

Caddy sends `X-Forwarded-Proto: https`, which the app uses to add
`upgrade-insecure-requests`. Any other proxy must pass that header and must
not strip the app's `Content-Security-Policy` header. Good regions for
Indian users: Mumbai or Hyderabad on AWS, Azure or Google Cloud; Bangalore
on DigitalOcean.

Updating: build a new tag, start it, then stop the old container. Keep the
previous tag for rollback.

## After every deploy

| Check | How |
| --- | --- |
| Pages load and tools work | Open the site on a phone; compress an image and merge two PDFs. |
| Security headers | `curl -sI https://your.domain \| grep -iE "content-security\|strict-transport\|x-frame"`; then [securityheaders.com](https://securityheaders.com) and [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory). |
| Nothing accepted except page loads | `curl -s -o /dev/null -w "%{http_code}" -X POST https://your.domain/` → `405`. |
| Search files | `https://your.domain/robots.txt`, `/sitemap.xml` (all URLs should use your domain). |
| Speed | [PageSpeed Insights](https://pagespeed.web.dev) on the home page and one tool page (mobile). |

## Search engines (once, after launch)

1. [Google Search Console](https://search.google.com/search-console): add a
   **Domain** property and verify with a DNS TXT record (no code change
   needed). Submit `https://your.domain/sitemap.xml`.
2. [Bing Webmaster Tools](https://www.bing.com/webmasters): import from
   Search Console. Bing also feeds several AI search products.
3. Check the share preview by pasting a link into WhatsApp and
   [the LinkedIn post inspector](https://www.linkedin.com/post-inspector/).

## Operations

- **Uptime:** an external monitor that requests `/robots.txt` every few
  minutes (it carries no user data).
- **Errors:** only server logs exist; there is no client error reporting by
  design. Logs contain request paths, never file data (files never reach the
  server).
- **Security updates:** Dependabot opens weekly pull requests; CI
  (`.github/workflows/ci.yml`) must pass before merging. Run `npm audit`
  before each release.
- **Security contact:** publish one before launch, at
  `public/.well-known/security.txt`:

  ```
  Contact: mailto:security@your.domain
  Expires: 2027-12-31T00:00:00.000Z
  Preferred-Languages: en, hi
  Canonical: https://your.domain/.well-known/security.txt
  ```
- **Requirement updates:** see `MAINTAINING_REQUIREMENTS.md`. When a new
  notification is published, add its record quickly — searches spike in the
  first days.
