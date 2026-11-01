import type { ApplicationSpecInput } from "../schema";

/**
 * Transcribed from CEN No. 06/2025 (scanned PDF, read via OCR and checked
 * visually against the page images), paras 14.4–14.5.2, pages 21–23 of 59,
 * and Corrigendum-1 dated 19.11.2025 (revised closing date). Read on 2026-10-29.
 */
export const RRB_RECORDS: ApplicationSpecInput[] = [
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
      publisher: "Railway Recruitment Boards, Ministry of Railways",
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      "Candidates do not upload a photograph; it is captured live in the application.",
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
