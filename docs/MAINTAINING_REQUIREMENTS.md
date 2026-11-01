# Maintaining requirement records

Exam requirements are the most sensitive data in this project: a wrong value
can get an application rejected. These rules exist to keep every value
traceable to an official document.

## Golden rules

1. **Only official sources.** A record's `source.url` must be the recruitment
   body's own document (notification, corrigendum or official instruction
   page) on its own domain, over HTTPS. Coaching sites, news sites and
   "resizer" tools are never sources — they frequently disagree with each
   other and with the notification.
2. **Never fill gaps.** If the source does not state a format, size or
   dimension, leave the field out and explain it in `specificationGaps`. The
   UI shows the gap and steers users to enter the value from the official
   instructions as a custom preset.
3. **Record what the source says, including its wording.** "Preferred"
   dimensions use `pixels.preferred: true`; "about 6 cm" uses
   `physical.approximate: true`; "less than 400 KB" uses
   `fileSize.maxExclusive: true`. Inconsistencies inside a notice go into
   `specificationGaps` verbatim in substance.
4. **One notification, one record.** Requirements are not assumed to carry
   over between cycles, posts or bodies, even when they usually do.
5. **Paraphrase conditions** (background colour, ink, capital letters …) in
   `conditions`; they are shown as manual checks.

## Verification statuses

| Status | Meaning | Requirements |
| --- | --- | --- |
| `verified` | A maintainer compared every value with the official source. | `source`, `lastVerified`, `verifiedBy` |
| `source-cited` | Values were transcribed from the cited official document; not yet re-checked by a second person. | `source`, `lastVerified` |
| `unverified` | Entered manually; source not confirmed. | — (UI warns) |
| `example` | Illustration only. Must use organisation `other` and `source: null`. | — (UI shows a red warning) |
| `user-entered` | Reserved for in-browser custom presets; rejected in the registry. | — |

Every record bundled today is `source-cited` (transcribed on 2026-10-29) or
`example`. **To promote a record to `verified`, a second person must
independently compare each value against the source PDF**, then set
`verificationStatus: "verified"`, `verifiedBy` (name or handle) and
`lastVerified`.

Records whose `lastVerified` is older than 365 days, and records whose
application window has closed, are flagged in the UI automatically.

## Adding or updating a record

1. Download the official notification and find the upload section (usually
   an annexure titled "Guidelines for scanning and upload of documents" or a
   paragraph such as "How to apply").
2. Add or edit a file in `data/exam-requirements/records/` and include it in
   `RAW_RECORDS` in `data/exam-requirements/index.ts`.
3. Fill in, from the document:
   - `notificationId` exactly as printed (e.g. `CRP PO/MT-XVI`, `CEN No. 06/2025`)
   - `notificationDate` (date printed on the notice; note in `notes` if you
     had to use another date such as the registration start)
   - `applicationWindow` (include corrigendum extensions)
   - per document: `formats`, `fileSize`, `pixels`, `physical`, `pageSize`,
     `conditions`, `specificationGaps`, and `sourceReference` (annexure /
     paragraph / page)
4. Set `lastVerified` to the date you read the source.
5. Run `npm test`. `tests/unit/exam-registry.test.ts` validates every record
   (schema, official domains, unique ids, status rules). A record that fails
   validation is excluded from the app and listed on `/exam/sources`.
6. Open `/exam/<record-id>` and check the page reads correctly.

Scanned notices (no text layer) can be read with OCR, but **check every
number visually against the page image** — OCR commonly confuses 3/8, 0/O
and 1/l. This was done for RRB CEN 06/2025.

## Field reference

See `data/exam-requirements/schema.ts`; every field is documented there.
Units: sizes in KB as printed; pixels as integers; physical sizes in mm.

## How limits are checked

- Maximum KB is checked as `KB × 1000` bytes and minimum KB as `KB × 1024`
  bytes, so a passing file passes under either reading of "KB".
- "Preferred" pixel dimensions are produced exactly when possible. If the
  file would be below the minimum size, the image is enlarged
  proportionally and the report marks the dimension check "check yourself"
  rather than "pass".
- Physical sizes, colours, backgrounds and handwriting rules are always
  manual checks.

## Records and their sources (as of 2026-10-29)

| Record | Source |
| --- | --- |
| `ibps-crp-po-mt-xvi` | ibps.in — Detailed Notification CRP PO/MT-XVI (dated 01.07.2026), Annexure III |
| `sbi-ja-2026` | sbi.bank.in — CRPD/CR/2026-27/17 (11.08.2026), Annexure-II |
| `sbi-po-2025` | sbi.bank.in — CRPD/PO/2025-26/04 (23.06.2025), Annexure II |
| `ssc-cgl-2026` | ssc.gov.in — Notice, CGL 2026 (21.05.2026), paras 9.4–9.6, Annexure IV |
| `ssc-chsl-2026` | ssc.gov.in — Notice, CHSL 2026 (07.09.2026), para 9.6 and annexure |
| `upsc-cse-2026` | upsc.gov.in — Examination Notice 05/2026-CSE (04.02.2026), Notes 2–3. Technical limits are not in the notice; UPSC's separate instruction document could not be retrieved, so none are recorded. |
| `rrb-ntpc-graduate-cen-06-2025` | rrbsecunderabad.gov.in — CEN No. 06/2025 (21.10.2025), paras 14.4–14.5.2; Corrigendum-1 (19.11.2025) |
| `example-photo-signature` | none (example) |

### Known follow-ups

- UPSC: add the photo and signature limits from UPSC's official "Photos and
  Signature" instructions on upsconline.nic.in once retrievable.
- SBI PO 2026-27 (CRPD/PO/2026-27/09) and newer IBPS / RRB cycles: add
  records when their notifications are read.
- Have a second maintainer verify the `source-cited` records.
