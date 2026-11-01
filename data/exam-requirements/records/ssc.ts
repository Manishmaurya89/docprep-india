import type { ApplicationSpecInput, DocumentRequirementInput } from "../schema";

/**
 * Transcribed from the official SSC notices (para 9.4–9.6 and Annexure IV,
 * “Part-II (Online Application Form)”). Read on 2026-10-29.
 *
 * SSC captures the photograph live in the application form; only the
 * signature is prepared as a file. The notices give two different signature
 * sizes (para 9.6 vs the annexure); both are shown to users.
 */
function sscDocuments(annexurePage: string): DocumentRequirementInput[] {
  return [
    {
      id: "live-photograph",
      type: "photograph",
      label: "Live photograph",
      required: "required",
      kind: "live-capture",
      conditions: [
        "Captured inside the application by webcam or mobile device, in good light against a plain background",
        "No cap, mask or spectacles; full frontal view with the whole face inside the frame",
        "Photographing an existing photograph is not allowed and leads to rejection",
      ],
      sourceReference: "Para 9.4–9.5",
    },
    {
      id: "signature",
      type: "signature",
      label: "Signature",
      required: "required",
      kind: "image",
      formats: ["jpeg"],
      fileSize: { minKB: 10, maxKB: 20 },
      physical: { widthMm: 60, heightMm: 20, approximate: true },
      conditions: ["Clear and legible; blurred or miniature signatures are rejected"],
      specificationGaps: [
        `The notice gives the signature size as about 6.0 cm × 2.0 cm in para 9.6 but about 4.0 cm × 2.0 cm in Annexure IV (${annexurePage}). No pixel dimensions are stated.`,
      ],
      sourceReference: "Para 9.6 and Annexure IV",
    },
  ];
}

export const SSC_RECORDS: ApplicationSpecInput[] = [
  {
    id: "ssc-chsl-2026",
    organizationId: "ssc",
    examName: "Combined Higher Secondary (10+2) Level Examination",
    recruitmentCycle: "2026",
    notificationId: "F. No. HQ-C1102/5/2026-C-1",
    notificationTitle: "Notice: Combined Higher Secondary (10+2) Level Examination, 2026",
    notificationDate: "2026-09-07",
    applicationWindow: { opens: "2026-09-07", closes: "2026-10-07" },
    source: {
      url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2026.pdf",
      title: "Notice of Combined Higher Secondary (10+2) Level Examination, 2026",
      publisher: "Staff Selection Commission",
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      "The photograph is captured live during the application, so no photo file is prepared in advance.",
      "PwBD candidates claiming reservation or a scribe must also upload the disability certificate in the applicable annexure format; the notice does not give a file size for it.",
    ],
    documents: sscDocuments("PDF page 53"),
  },
  {
    id: "ssc-cgl-2026",
    organizationId: "ssc",
    examName: "Combined Graduate Level Examination",
    recruitmentCycle: "2026",
    notificationId: "F. No. HQ-C11018/1/2026-C-1",
    notificationTitle: "Notice: Combined Graduate Level Examination, 2026",
    notificationDate: "2026-05-21",
    applicationWindow: { opens: "2026-05-21", closes: "2026-06-22" },
    source: {
      url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf",
      title: "Notice of Combined Graduate Level Examination, 2026",
      publisher: "Staff Selection Commission",
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      "The photograph is captured live during the application, so no photo file is prepared in advance.",
      "PwBD candidates claiming reservation or a scribe must also upload the disability certificate in the applicable annexure format; the notice does not give a file size for it.",
    ],
    documents: sscDocuments("notice page 70"),
  },
];
