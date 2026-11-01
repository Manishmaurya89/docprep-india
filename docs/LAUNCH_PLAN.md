# Launch and Growth Plan

Prepared 2026-10-29. Goal: launch publicly, then grow to a large, returning
audience of people filling in online forms in India — without ever
compromising the promise that files stay on the user's device.

## 1. Positioning

**One line:** Free tools that get your photos, signatures and documents
accepted by any online form — and your files never leave your phone.

**Who:** exam and job applicants (SSC, UPSC, banks, railways, state boards);
anyone doing bank KYC, passport or visa forms, admissions, scholarships and
insurance claims; cyber-café and Common Service Centre (CSC) operators who
fill forms for others every day.

**Why us, in the user's words:**

| What they worry about | What we say (and can prove) |
| --- | --- |
| "Will my Aadhaar be uploaded somewhere?" | Files are processed on your phone. The server refuses any upload (tested), and the security policy blocks sending data elsewhere. |
| "The portal rejected my photo again." | Exact pixel size and KB limits, measured from the final file, with a pass/fail checklist. Exam limits come from the official notification. |
| "These sites are slow and full of ads." | About 190 KB per first visit, content shows in about 0.6 s on slow 4G (measured), no ads, no sign-up. |

**Competitors and our edge:** global tools (iLovePDF, Smallpdf, Adobe
online) upload your file to their servers and often limit free use; Indian
"photo resizer" sites are usually ad-heavy, upload files and guess the
limits. Our edge is privacy you can verify, exactness and speed.

## 2. Ready now (built and tested)

- Image tools, PDF tools, exam workflow for 7 official notifications, custom
  presets, page arranger, size-limit compression.
- Search setup: search-friendly titles and descriptions on every page,
  canonical links, sitemap, robots rules, structured data, share preview
  image, installable web app (manifest and icons).
- **16 size landing pages** for the most searched sizes:
  `/tools/compress-image/{10kb … 2mb}` and `/tools/compress-pdf/{100kb … 2mb}`.
- WhatsApp / share buttons on every tool (page link only, no tracking).
- **Hindi version** at `/hi/…` for every page except the reviewer sheet:
  all tools, size pages, exam workflow, privacy page, error messages and
  the pass/fail report. Hindi titles and descriptions use search wording
  ("फोटो का साइज KB में कम करें", "पीडीएफ का साइज 200 केबी"); `hreflang`
  links pair each English and Hindi page and both are in the sitemap. The
  language is chosen only by the URL (switch in the header; nothing stored).
  Official values from notifications stay in English. Text lives in
  `lib/i18n/en.ts` and `lib/i18n/hi.ts`.
- Security: strict CSP for pages and workers, non-GET requests refused, no
  cookies or storage, no third-party requests, dependency audit clean.
- Deployment: Vercel-ready, Dockerfile, CI workflow, Dependabot.

## 3. Launch blockers (owner decisions — do these first)

| # | Task | Owner | Notes |
| --- | --- | --- | --- |
| 1 | Pick the brand name and buy the domain (.in or .com) | You | Check trademarks; avoid government-looking names. Then `npm run brand-assets`. |
| 2 | Choose hosting (Vercel Pro or a Mumbai VPS) and deploy | You + engineer | Follow `DEPLOYMENT.md`. |
| 3 | Second person verifies the 7 requirement records | Reviewer | Use `/exam/verify`. A wrong limit is the biggest reputational risk. |
| 4 | Contact address, `security.txt`, terms of use | You | Have the privacy page and terms reviewed by a lawyer (DPDP Act 2023, IT Act). Not legal advice. |
| 5 | Test on a low-cost Android phone and an iPhone | You | Use `MANUAL_TEST_PLAN.md`. |
| 6 | Publish the source code (optional, recommended) | You | "Don't trust us — read the code" is the strongest proof of a privacy claim. |
| 7 | Native Hindi speaker reviews all Hindi text | Reviewer (native speaker) | Read `lib/i18n/hi.ts` and click through `/hi` on a phone. Check that it reads as natural, simple Hindi (not machine translation), that error messages and the pass/fail report are clear, and that search titles match how people search. Style choice to confirm: English loanwords are written without nukta (फाइल, साइज) because that is how most people type them. Do not launch `/hi` until this is done. |

## 4. Launch week

| Day | Action |
| --- | --- |
| D-2 | Deploy to production; run the "After every deploy" checks; fix anything red. |
| D-1 | Search Console and Bing Webmaster set up; sitemap submitted; share preview checked in WhatsApp. |
| D0 | Announce (see channels below). Watch server logs and uptime. |
| D+1…7 | Reply to every message and bug report within a day. Fix issues same day. |

## 5. Growth channels (in priority order)

### 5.1 Search (largest, compounding)

People search for the exact task: "photo resize 20 kb", "signature resize
140×60", "compress pdf to 200 kb", "jpg to pdf", "ssc photo size", "ibps
signature size". Demand spikes when notifications come out.

1. **Size pages** (done). Add more as Search Console shows demand
   (e.g. 15 KB, 40 KB, 150 KB).
2. **Dimension pages:** "resize photo to 200×230", "signature 140×60",
   "3.5 × 4.5 cm photo" — preset the photo & signature maker.
3. **Notification pages:** add each new SSC / IBPS / SBI / RRB / UPSC / state
   PSC notification within 48 hours of release. Each record page already has
   a search title ("IBPS … Photo, Signature & Document Size").
4. **Hindi version** (`/hi/…`) is built (see section 2); after the native
   review, add Tamil, Telugu, Bengali, Marathi the same way (a new
   dictionary file plus route files). Hindi queries ("फोटो का साइज कम कैसे
   करें") are a large, under-served market. Submit the sitemap again after
   launch so the Hindi pages are found.
5. **Short how-to guides** with screenshots on each tool page ("How to make
   a 20 KB photo on your phone") — answer the question, no padding.
6. Track in Search Console: impressions, clicks, average position per page;
   improve titles of pages with high impressions and low clicks.

### 5.2 Communities where applicants already are

- **Telegram and WhatsApp groups** for SSC, banking and railway aspirants:
  share a genuinely useful tip ("how to fix 'photo size must be 20–50 KB'
  without uploading your photo anywhere"). Follow each group's rules; never
  spam.
- **YouTube Shorts and Instagram Reels** (Hindi first): 30-second screen
  recordings — photo to 20 KB, Aadhaar front and back into one PDF, PDF to
  200 KB. Post around big notification dates.
- **Reddit / Quora** answers to the exact questions people ask, linking the
  matching size page.

### 5.3 Partnerships

- **Cyber cafés and CSC operators:** they process strangers' Aadhaar and
  certificates daily. Offer a printable A4 poster with a QR code ("Your
  documents never leave this computer"). Strongest privacy story.
- **Coaching institutes and test-series sites:** a free, private tool to
  recommend in their application-season emails. Offer a clean link to the
  exact notification page.
- **College placement cells, NGOs and libraries** helping first-time
  applicants.

### 5.4 Press and launch sites

- Privacy story for Indian tech press: document leaks from "free" upload
  sites are recurring news; this tool is the opposite by design (and the
  code is public).
- Product Hunt and "Show HN" once the site is stable and public on GitHub.

### 5.5 Retention

- "Add to home screen" (manifest is ready) so repeat users open it like an
  app.
- Share buttons on every tool (done) — most discovery in India is through
  WhatsApp forwards.
- Next: work offline after the first visit (service worker caching only the
  site's own files), useful on poor connections at form-filling time.

## 6. Measuring without tracking anyone

The privacy page says there is no analytics, and that must stay true unless
it is changed openly first.

| Question | Source (no tracking code on the site) |
| --- | --- |
| How many people find us, for which searches? | Google Search Console, Bing Webmaster Tools |
| Which pages are used? | Aggregated request counts per page from hosting logs (no IP addresses kept) |
| Is it working for people? | Replies in communities, emails, GitHub issues |
| Speed for real users | PageSpeed Insights field data (Chrome UX Report) once traffic is enough |

If, later, you want on-site analytics: use a cookieless, self-hosted tool
that records page views only, update the privacy page and the CSP **before**
enabling it, and never include anything about files.

**Targets for the first 90 days** (adjust after the first month; all
measurable in Search Console): every sitemap page indexed within 4 weeks;
10 000 search clicks a month by month 3 (depends heavily on the notification
calendar); a first-page ranking for at least 20 "compress … to … KB" and
"… photo size" queries; 10 active partners (cafés, CSCs, institutes).

## 7. Money (optional)

Ads would add third-party scripts and break the privacy promise — not
recommended. Options that keep the promise: voluntary support (UPI QR on an
"About" page), and plain-text sponsorship by coaching institutes ("Supported
by …", no scripts, no tracking). Running costs are low: no database or
storage, and roughly 190 KB served per visit.

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| A requirement value is wrong and applications are rejected | Second-person verification, visible status and source links, the "check yourself" items, fast corrections. |
| Name or look is mistaken for an official site | Neutral brand, no emblems, the "not affiliated" footer. |
| Traffic spikes on notification days | Pages are light; static files cached for a year; use a CDN-backed host (Vercel) or scale containers. |
| Low-memory phones fail on huge files | Limits and clear errors are built in; suggest smaller files in the error text. |
| Copycats | Speed, accuracy and openness compound; keep notification records the most current. |

## 9. Next engineering tasks for growth

1. Hindi localisation: built; launch after the native-speaker review
   (blocker 7). Next languages: Tamil, Telugu, Bengali, Marathi.
2. Dimension landing pages and more size pages from Search Console data.
3. Offline support (service worker for the site's own files).
4. Notification-day workflow: a checklist and template so a new official
   record can be added and verified within 48 hours.
5. Move PDF parsing into a worker with a time limit, so a malicious PDF can
   never freeze the page (today it can only freeze its own tab).
