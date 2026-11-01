import type { ApplicationSpecInput } from "../schema";

/**
 * Transcribed from Examination Notice No. 05/2026-CSE, Notes 2 and 3
 * (“Important information for the candidates”). Read on 2026-10-29.
 *
 * The notice itself does not give file formats, sizes or dimensions; it refers
 * candidates to the “Instructions and FAQs > Photos and Signature” section of
 * upsconline.nic.in. That page could not be retrieved when this record was
 * written, so no technical limits are recorded rather than copying figures
 * from unofficial websites (which disagree with each other).
 */
const GAP =
  "The notice does not state the file format, size or dimensions. UPSC publishes them under “Instructions and FAQs → Instruction for filling the form → Photos and Signature” on upsconline.nic.in. Enter them as a custom preset.";

export const UPSC_RECORDS: ApplicationSpecInput[] = [
  {
    id: "upsc-cse-2026",
    organizationId: "upsc",
    examName: "Civil Services (Preliminary) Examination",
    recruitmentCycle: "2026",
    notificationId: "Examination Notice No. 05/2026-CSE",
    notificationTitle: "Civil Services Examination, 2026",
    notificationDate: "2026-02-04",
    applicationWindow: { opens: "2026-02-04", closes: "2026-02-24" },
    source: {
      url: "https://www.upsc.gov.in/sites/default/files/Notif-CSP-2026-Engl-060226Rev.pdf",
      title: "Examination Notice No. 05/2026-CSE (English)",
      publisher: "Union Public Service Commission",
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      "Photo and signature are uploaded in the Common Application Form (CAF) on upsconline.nic.in, and a live photograph is also captured.",
      "This record contains only what the notice states. Technical limits are published separately by UPSC.",
    ],
    documents: [
      {
        id: "photograph",
        type: "photograph",
        label: "Photograph (uploaded)",
        required: "required",
        kind: "image",
        conditions: ["Clear, as per UPSC’s “Photos and Signature” instructions"],
        specificationGaps: [GAP],
        sourceReference: "Note 2 — Live Photo Capture for filling up of CAF",
      },
      {
        id: "live-photograph",
        type: "photograph",
        label: "Live photograph",
        required: "required",
        kind: "live-capture",
        conditions: ["Captured while filling up the Common Application Form"],
        sourceReference: "Note 2",
      },
      {
        id: "signature",
        type: "signature",
        label: "Signature (three times)",
        required: "required",
        kind: "image",
        conditions: [
          "Sign three times, one below the other, on plain white paper",
          "Use black ink",
          "Clear and legible",
        ],
        specificationGaps: [GAP],
        sourceReference: "Note 3 — Uploading of Signature",
      },
    ],
  },
];
