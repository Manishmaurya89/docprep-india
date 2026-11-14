import type { ApplicationSpecInput } from "../schema";

const RRB_PUBLISHER = "Railway Recruitment Boards, Ministry of Railways";
const LIVE_PHOTO_NOTE = "Candidates do not upload a photograph; it is captured live in the application.";

/** Live-photo rules shared by the 2026 CENs (07/2026 para 14.4, 08/2026 para 16.5, 09/2026 para 14.4). */
const LIVE_PHOTO_2026 = [
  "Captured by webcam or the phone’s front camera during the application",
  "Pure plain white background; wear non-white, preferably plain dark, clothing that covers the shoulders and chest",
  "The head should fill at least 50% of the photo; nothing below the chest should show",
  "No cap, mask or spectacles; face fully visible, eyes fully open",
  "Do not photograph a printed or digital photo",
];

/** One 2026 CEN: live photo, signature and the optional SC/ST certificate; only the paras and signature box differ. */
function cen2026(refs: { photo: string; signature: string; certificate: string; signatureBox: string }): ApplicationSpecInput["documents"] {
  return [
    { id: "live-photograph", type: "photograph", label: "Live photograph", required: "required", kind: "live-capture", conditions: LIVE_PHOTO_2026, sourceReference: refs.photo },
    {
      id: "signature",
      type: "signature",
      label: "Signature",
      required: "required",
      kind: "image",
      formats: ["jpeg"],
      fileSize: { minKB: 30, maxKB: 49 },
      pixels: { minWidth: 140, minHeight: 60, dpi: 100 },
      conditions: [
        "Scanned at a resolution of at least 100 DPI",
        "Black ink pen on white paper; non-white backgrounds are grounds for rejection",
        "Running (cursive) handwriting — not BLOCK, CAPITAL or disjointed letters",
        `Fully visible and centred within the ${refs.signatureBox} signature box`,
      ],
      sourceReference: refs.signature,
    },
    {
      id: "sc-st-certificate",
      type: "category-certificate",
      label: "SC/ST certificate",
      required: "conditional",
      condition: "Only for SC/ST candidates who want the free railway travel pass for the examination.",
      kind: "pdf",
      formats: ["pdf"],
      fileSize: { maxKB: 400, maxExclusive: true },
      conditions: ["Legible and clear", "Latest valid certificate as on the closing date for applications"],
      sourceReference: refs.certificate,
    },
  ];
}

/**
 * CEN No. 06/2025: transcribed from the scanned PDF (read via OCR and checked
 * visually against the page images), paras 14.4–14.5.2, pages 21–23 of 59,
 * and Corrigendum-1 dated 19.11.2025 (revised closing date). Read on 2026-10-29.
 *
 * CEN Nos. 07/2026, 08/2026 and 09/2026: transcribed from the text PDFs linked
 * on the official RRB application portal (rrbapply.gov.in), read on 2026-11-14:
 * - 07/2026: paras 14.4–14.5.2, pages 23–25 of 57, and Corrigendum-1 dated
 *   13.11.2026 (closing date 13.11.2026 → 15.11.2026). Published 14.10.2026.
 * - 08/2026: paras 16.5–16.6, pages 23–24 of 46. Listed on the portal 27.10.2026.
 *   Its signature box is 50 mm × 20 mm (the other CENs say 35 mm × 20 mm).
 * - 09/2026: paras 14.4–14.5.2, pages 22–23 of 59. Listed on the portal 05.11.2026.
 */
export const RRB_RECORDS: ApplicationSpecInput[] = [
  {
    id: "rrb-station-master-cen-08-2026",
    organizationId: "rrb",
    examName: "Station Master",
    recruitmentCycle: "2026-27",
    notificationId: "CEN No. 08/2026",
    notificationTitle: "Centralised Employment Notice No. 08/2026 — Station Master",
    notificationDate: "2026-10-27",
    applicationWindow: { opens: "2026-10-27", closes: "2026-11-25" },
    source: {
      url: "https://www.rrbapply.gov.in/assets/forms/CEN_08_2026_StationMaster.pdf",
      title: "CEN No. 08/2026 (English), as linked on the RRB application portal",
      publisher: RRB_PUBLISHER,
    },
    lastVerified: "2026-11-14",
    verificationStatus: "source-cited",
    notes: [LIVE_PHOTO_NOTE, "Application fee can be paid until 27.11.2026; the paid correction window runs 28.11.2026 to 07.12.2026."],
    documents: cen2026({ photo: "Para 16.5", signature: "Para 16.6(a)", certificate: "Para 16.6(b)", signatureBox: "50 mm × 20 mm" }),
  },
  {
    id: "rrb-isolated-categories-cen-09-2026",
    organizationId: "rrb",
    examName: "Isolated Categories",
    recruitmentCycle: "2026-27",
    notificationId: "CEN No. 09/2026",
    notificationTitle: "Centralised Employment Notification No. 09/2026 — Isolated Categories",
    notificationDate: "2026-11-05",
    applicationWindow: { opens: "2026-11-05", closes: "2026-12-04" },
    source: {
      url: "https://www.rrbapply.gov.in/assets/forms/CEN_09_2026_IsolatedCategory.pdf",
      title: "CEN No. 09/2026 (English), as linked on the RRB application portal",
      publisher: RRB_PUBLISHER,
    },
    lastVerified: "2026-11-14",
    verificationStatus: "source-cited",
    notes: [LIVE_PHOTO_NOTE, "Application fee can be paid until 06.12.2026; the paid correction window runs 07.12.2026 to 16.12.2026."],
    documents: cen2026({ photo: "Para 14.4", signature: "Para 14.5.1", certificate: "Para 14.5.2", signatureBox: "35 mm × 20 mm" }),
  },
  {
    id: "rrb-ntpc-undergraduate-cen-07-2026",
    organizationId: "rrb",
    examName: "Non-Technical Popular Categories (Under Graduate)",
    recruitmentCycle: "2026-27",
    notificationId: "CEN No. 07/2026",
    notificationTitle: "Centralised Employment Notice No. 07/2026 — NTPC (Under Graduate)",
    notificationDate: "2026-10-14",
    applicationWindow: { opens: "2026-10-15", closes: "2026-11-15" },
    source: {
      url: "https://www.rrbapply.gov.in/assets/forms/CEN_07_2026_NTPC_UG.pdf",
      title: "CEN No. 07/2026 (English), as linked on the RRB application portal",
      publisher: RRB_PUBLISHER,
    },
    lastVerified: "2026-11-14",
    verificationStatus: "source-cited",
    notes: [
      LIVE_PHOTO_NOTE,
      "The closing date shown includes the two-day extension in Corrigendum-1 (13.11.2026).",
      "The paid correction window runs 16.11.2026 to 25.11.2026.",
    ],
    documents: cen2026({ photo: "Para 14.4", signature: "Para 14.5.1", certificate: "Para 14.5.2", signatureBox: "35 mm × 20 mm" }),
  },
  {
    id: "rrb-ntpc-graduate-cen-06-2025",
    organizationId: "rrb",
    examName: "Non-Technical Popular Categories (Graduate)",
    recruitmentCycle: "2025-26",
    notificationId: "CEN No. 06/2025",
    notificationTitle: "Centralised Employment Notification No. 06/2025 — NTPC (Graduate)",
    notificationDate: "2025-10-21",
    applicationWindow: { opens: "2025-10-21", closes: "2025-11-27" },
    source: {
      url: "https://rrbsecunderabad.gov.in/wp-content/uploads/2025/10/Final-CEN-06-2025-21-10-2025-Publish.pdf",
      title: "CEN No. 06/2025 (English), as hosted by RRB Secunderabad",
      publisher: RRB_PUBLISHER,
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      LIVE_PHOTO_NOTE,
      "The closing date shown includes the extension in Corrigendum-1 (19.11.2025).",
      "The same CEN is published on every RRB website; the copy cited here is RRB Secunderabad’s.",
    ],
    documents: [
      {
        id: "live-photograph",
        type: "photograph",
        label: "Live photograph",
        required: "required",
        kind: "live-capture",
        conditions: [
          "Captured by webcam or the phone’s front camera during the application",
          "Wear non-white, preferably dark, clothing; no cap, mask or spectacles; eyes fully open",
          "Do not photograph a printed or digital photo",
        ],
        sourceReference: "Para 14.4",
      },
      {
        id: "signature",
        type: "signature",
        label: "Signature",
        required: "required",
        kind: "image",
        formats: ["jpeg"],
        fileSize: { minKB: 30, maxKB: 49 },
        pixels: { minWidth: 140, minHeight: 60, dpi: 100 },
        conditions: [
          "Scanned at a resolution of at least 100 DPI",
          "Black ink pen on white paper; non-white backgrounds are grounds for rejection",
          "Running (cursive) handwriting — not BLOCK, CAPITAL or disjointed letters",
          "Fully visible and centred within the 35 mm × 20 mm signature box",
        ],
        sourceReference: "Para 14.5.1",
      },
      {
        id: "sc-st-certificate",
        type: "category-certificate",
        label: "SC/ST certificate",
        required: "conditional",
        condition: "Only for SC/ST candidates who want the free railway travel pass for the examination.",
        kind: "pdf",
        formats: ["pdf"],
        fileSize: { maxKB: 400, maxExclusive: true },
        conditions: ["Legible and clear", "Latest valid certificate as on the closing date for applications"],
        sourceReference: "Para 14.5.2",
      },
    ],
  },
];
