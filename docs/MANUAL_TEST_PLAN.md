# Manual Test Plan

Hands-on checks to complement the automated suites. Every "Expected" below was
observed with the generated sample files in Chrome on 2026-10-29 (and is
re-checked automatically by `tests/e2e/sample-files.spec.ts`).

## 0. Set up

```bash
npm install
npm run samples            # writes synthetic test files to sample-files/
npm run build && npm start # http://localhost:3000
```

The sample files are drawn by a script — none contain real people or
documents. Use them instead of your own ID documents while testing.

**Test on your phone (same Wi-Fi):** run
`npm run build && npm start -- --hostname 0.0.0.0 --port 3000`, find your
computer's address (`ipconfig getifaddr en0` on macOS), and open
`http://<that address>:3000` on the phone. macOS may ask to allow incoming
connections. Stop the server afterwards — it is visible to your local network
while it runs.

Record failures with: page URL, file used, browser and device, what you saw.

---

## 1. Privacy — verify nothing is uploaded

- [ ] Open DevTools → **Network**, tick "Preserve log", clear it. Process any
  file in any tool. **Expected:** no request contains your file; there are no
  `POST`/`PUT` requests and no requests to other domains. (You may see
  same-site `.js` files or `/vendor/pdfjs/...` the first time a tool loads.)
- [ ] After processing one file, set DevTools Network to **Offline** and
  process another file in the same tool. **Expected:** it still works —
  processing happens on your device.
- [ ] DevTools → **Application** → Cookies and Local Storage. **Expected:**
  both empty — the site stores nothing in your browser.
- [ ] DevTools → Network → select the page document → Headers.
  **Expected:** `Content-Security-Policy` includes `connect-src 'self'`.
- [ ] Read `/privacy`. **Expected:** says all tools process files on your
  device, and the table shows "Runs on this device" for every tool.

## 2. Image tools

| ✓ | Tool and file | Steps | Expected |
| --- | --- | --- | --- |
| [ ] | Resize · `photo-portrait.jpg` | Width 600 with lock on | Height becomes 800; download is 600 × 800 |
| [ ] | Resize · same | Width 3000 (enlarging off) | Warning that it was reduced to avoid enlarging; result 1200 × 1600 |
| [ ] | Resize · same | Lock off, 600 × 600 | Warning that the image will be stretched |
| [ ] | Resize · `photo-phone-rotated.jpg` | Just select it | Shown upright as 1200 × 1600 (stored sideways with an EXIF tag) |
| [ ] | Compress · `large-photo-12mp.jpg` | 200 KB | "… within your 200 KB limit" (≈179,000 bytes, checked as at most 200,000 bytes); reported size equals the downloaded file's size |
| [ ] | Compress · same | 5 KB, reduce dimensions off | Clear warning that 5 KB could not be reached; result labelled as not meeting the limit |
| [ ] | Compress · same | Start 5 KB, press **Cancel** | "Cancelled. Your original file is unchanged." |
| [ ] | Crop & rotate · `photo-portrait.jpg` | Ratio 3.5:4.5, drag the box and a corner | Box keeps the ratio; output matches the box |
| [ ] | Crop & rotate · same | Tab to the crop box, use arrow keys, then Shift+arrows | Box moves, then resizes |
| [ ] | Crop & rotate · same | Rotate right, flip, Reset | Preview rotates/flips; Reset restores the original |
| [ ] | Convert · `logo-transparent.png` → JPEG | Pick a fill colour | Warning "Transparency will be lost"; transparent areas use the colour |
| [ ] | Convert · `webp-image.webp` → PNG | — | PNG download, same dimensions |

## 3. PDF tools

| ✓ | Tool and file | Steps | Expected |
| --- | --- | --- | --- |
| [ ] | Merge · `document-5-pages.pdf` + `appendix-2-pages-letter.pdf` | Move the appendix up, merge | 7 pages, appendix first |
| [ ] | Split · `document-5-pages.pdf` | Ranges `1-2, 4-` | Two files (pages 1–2, 4–5) plus a ZIP of both |
| [ ] | Split · same | Range `9` | Message that 9 is beyond the last page; Split disabled |
| [ ] | Extract · same | Tick pages 2 and 5 | 2-page PDF: pages 2 and 5 |
| [ ] | Reorder/rotate/delete · same | Move page 3 earlier, rotate page 1, delete page 2 | Previews update; output has 4 pages in the new order |
| [ ] | Compress · `photos-album-large.pdf` | Recommended | ≈5.0 MB → ≈279 KB; "Images recompressed" shown |
| [ ] | Compress · `document-5-pages.pdf` | Recommended | Either a small reduction or "No reduction achieved" — never a false claim |
| [ ] | Compress · `scanned-certificate.pdf` | Maximum | Warning that text stops being selectable; much smaller file |
| [ ] | Images → PDF · `photo-portrait.jpg`, `photo-phone-rotated.jpg`, `webp-image.webp` | A4, Auto | Each image is shown on its page as it will print; the PDF has 3 pages; the phone photo is upright |
| [ ] | Images → PDF · `certificate-scan-a4.jpg` + `large-photo-12mp.jpg` | Drag the second page onto the first (mouse, or the ⠿ grip with a finger); then rotate a page | Previews swap and show "Page 1 / Page 2"; rotation shows immediately; the PDF follows exactly what you see |
| [ ] | PDF → JPG/PNG · `document-5-pages.pdf` | Defaults (JPG, Standard) | 5 images of 1240 × 1754 px at 150 DPI, each downloadable, plus a ZIP named `document-5-pages-jpg.zip` |
| [ ] | PDF → JPG/PNG · `password-protected.pdf` | Type a wrong password, then `test1234` | "That password is not correct", then "opened with its password"; the image shows the page content |
| [ ] | PDF → JPG/PNG · `scanned-certificate.pdf` | JPG, size limit 200 KB | Image ≤ 200 KB, or a clear message that the limit could not be reached |
| [ ] | PDF → JPG/PNG · your own e-Aadhaar (optional) | Password = first 4 letters of your name in capitals + year of birth | Both pages of the card become images; nothing appears in the browser's network panel |

## 4. Government application preparation

- [ ] `/exam` → IBPS → **Prepare documents** (CRP PO/MT-XVI). **Expected:**
  "From official source — not yet re-checked" badge, "Application window has
  closed" note, **Open official document** links to ibps.in.
- [ ] Prepare each document. **Expected:**

  | Document | File | Expected result |
  | --- | --- | --- |
  | Photograph | `photo-portrait.jpg` | 200 × 230 px, ≈24 KB, measurable checks pass |
  | Signature | `signature-scan.jpg` | ≈12 KB at 250 × 107 px with a note that it was enlarged proportionally from the *preferred* 140 × 60 px to reach the 10 KB minimum; dimension check marked "check yourself" |
  | Left thumb impression | `thumb-impression.jpg` | 240 × 240 px, ≈38 KB, pass |
  | Handwritten declaration | `handwritten-declaration.jpg` | 800 × 400 px, ≈86 KB, pass |
  | Class 10 certificate | `scanned-certificate.pdf` (or `certificate-scan-a4.jpg`) | ≈227 KB A4 PDF, pass, note that images were recompressed |

- [ ] **Download all as ZIP.** **Expected:** 5 files named
  `photograph.jpg`, `signature.jpg`, `left-thumb-impression.jpg`,
  `handwritten-declaration.jpg`, `class-10-certificate.pdf`.
- [ ] "Certificate under Clause J (ix)": tick **This applies to me**.
  **Expected:** an upload area appears and the checklist includes it.
- [ ] Photograph card: choose **Fit with border** and a grey colour.
  **Expected:** whole selection kept with a grey border, still 200 × 230.
- [ ] Signature card: **Clean up scan**. **Expected:** greyscale, higher contrast.
- [ ] Class 10 certificate: choose two photos of pages. **Expected:** both
  appear as A4 page previews; reorder or rotate them before **Prepare PDF**;
  the PDF pages come out in that order.
- [ ] Replace a prepared file with another. **Expected:** the old result
  disappears; checklist returns to "Not prepared" until you prepare again.
- [ ] SSC CGL 2026. **Expected:** live photograph shown as "Taken inside the
  application form"; signature shows the 6.0 vs 4.0 cm discrepancy warning.
- [ ] UPSC CSE 2026. **Expected:** warnings that the notice does not state
  file format, size or dimensions.
- [ ] RRB CEN 06/2025 signature with `signature-scan.jpg`. **Expected:** pass
  (≈45 KB, at least 140 × 60 px).
- [ ] `/exam/example-photo-signature`. **Expected:** red "Example only — not
  an official requirement" warning.
- [ ] `/exam/custom`: enter min 60, max 50. **Expected:** "The minimum size is
  larger than the maximum." Fix it, **Use these requirements**, prepare a file.
- [ ] `/tools/photo-signature`: **Start from a notification** → pick a
  document. **Expected:** fields fill in; note says where they were copied from.
- [ ] Signature 140 × 60 exact, 10–20 KB (custom, not "preferred") with
  `signature-plain-small.png`. **Expected:** "1 not met" — minimum size fails
  honestly (no padding, no enlarging for an exact size).

## 5. Error handling

| ✓ | File | Where | Expected message |
| --- | --- | --- | --- |
| [ ] | `not-really-an-image.jpg` | Any image tool | Not a JPEG, PNG or WebP image; renaming does not change format |
| [ ] | `iphone-photo.heic` | Any image tool | HEIC not supported, with the iPhone "Most Compatible" tip |
| [ ] | `empty-file.png` | Any image tool | File is empty (0 bytes) |
| [ ] | `damaged.png` | Any image tool | Could not be decoded / damaged |
| [ ] | `not-really-a.pdf` | Any PDF tool | Not a PDF |
| [ ] | `broken.pdf` | Any PDF tool | Damaged, with the "Print to PDF" tip |
| [ ] | `password-protected.pdf` (password `test1234`) | Any PDF tool except PDF → JPG/PNG | Password-protected or locked, with how to make an unlocked copy (PDF → JPG/PNG asks for the password instead) |
| [ ] | `photo-portrait.jpg` | Merge PDF | Rejected as not a PDF |

## 6. Accessibility and layout

- [ ] Keyboard only (Tab / Shift+Tab / Enter / Space / arrows): the skip
  link appears first; every control is reachable with a visible focus ring;
  the file picker opens with Enter or Space.
- [ ] Press `/` on the home page. **Expected:** search box focused.
- [ ] Zoom the browser to 200%. **Expected:** nothing overlaps or is cut off.
- [ ] Scroll the home page slowly. **Expected:** the shield, cloud and
  signature in the top picture drift a little; cards slide up as they
  appear. Turn on "Reduce motion" (macOS: Accessibility → Display; iPhone:
  Accessibility → Motion) and reload. **Expected:** everything stays still.
- [ ] Every tool page shows the green "Your file stays on this device"
  banner above the upload area.
- [ ] Phone: menu opens/closes; no sideways scrolling; crop box can be
  dragged with a finger.
- [ ] With a screen reader (VoiceOver: Cmd+F5 on macOS), prepare one
  document. **Expected:** progress, results and errors are announced.

## 7. Verify the requirement data

1. Open `/exam/verify` (linked from `/exam/sources`).
2. For each record, open the official document link and find the "Source
   reference" for each document.
3. Tick each value that matches **exactly**, including words such as
   "preferred", "about" and "less than".
4. Save or print the page as PDF to keep your record.
5. Report any mismatch with the record id. If a record matches fully, a
   maintainer marks it `verified` with your name (see
   `MAINTAINING_REQUIREMENTS.md`).
