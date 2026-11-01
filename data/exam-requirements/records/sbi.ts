import type { ApplicationSpecInput, DocumentRequirementInput } from "../schema";

/**
 * Transcribed from the official SBI advertisements (Annexure II, “Guidelines for
 * scanning and Upload of Photograph, Signature, Left-Hand Thumb Impression and
 * Hand-Written Declaration”). Read on 2026-10-29.
 * Both advertisements state the same specifications; they are kept as separate
 * records because each notification is the authority for its own recruitment.
 */
function sbiDocuments(reference: string): DocumentRequirementInput[] {
  return [
    {
      id: "photograph",
      type: "photograph",
      label: "Photograph",
      required: "required",
      kind: "image",
      formats: ["jpeg"],
      fileSize: { minKB: 20, maxKB: 50 },
      pixels: { width: 200, height: 230, preferred: true },
      physical: { widthMm: 35, heightMm: 45 },
      conditions: [
        "Recent passport-style colour photograph against a light-coloured, preferably white, background",
        "Looking straight at the camera with a relaxed face; no harsh shadows or red-eye",
        "No caps, hats or dark glasses (religious headwear allowed if the face is not covered)",
        "Keep about 8 copies of the same photograph for later stages",
      ],
      sourceReference: `${reference}, “Photograph (4.5 cm x 3.5 cm)”`,
    },
    {
      id: "live-photograph",
      type: "photograph",
      label: "Live photograph",
      required: "required",
      kind: "live-capture",
      conditions: ["Captured inside the application using a webcam or mobile phone"],
      sourceReference: `${reference}, “Photograph Capture”`,
    },
    {
      id: "signature",
      type: "signature",
      label: "Signature",
      required: "required",
      kind: "image",
      formats: ["jpeg"],
      fileSize: { minKB: 10, maxKB: 20 },
      pixels: { width: 140, height: 60, preferred: true },
      conditions: ["Signed on white paper with a black ink pen", "Not in CAPITAL LETTERS", "Must match your signature at the examination"],
      sourceReference: `${reference}, “Signature”`,
    },
    {
      id: "left-thumb-impression",
      type: "left-thumb-impression",
      label: "Left-hand thumb impression",
      required: "required",
      kind: "image",
      formats: ["jpeg"],
      fileSize: { minKB: 20, maxKB: 50 },
      pixels: { width: 240, height: 240, preferred: true, dpi: 200 },
      physical: { widthMm: 30, heightMm: 30 },
      conditions: ["On white paper with black or blue ink", "If you have no left thumb, you may use your right thumb"],
      sourceReference: `${reference}, “Left-Hand Thumb Impression”`,
    },
    {
      id: "handwritten-declaration",
      type: "handwritten-declaration",
      label: "Hand-written declaration",
      required: "required",
      kind: "image",
      formats: ["jpeg"],
      fileSize: { minKB: 50, maxKB: 100 },
      pixels: { width: 800, height: 400, preferred: true, dpi: 200 },
      physical: { widthMm: 100, heightMm: 50 },
      conditions: [
        "Written clearly in English on white paper with black ink",
        "Not in CAPITAL LETTERS",
        "Uses the declaration text given in the advertisement (it includes your name and date of birth)",
      ],
      sourceReference: `${reference}, “Hand-Written Declaration”`,
    },
  ];
}

export const SBI_RECORDS: ApplicationSpecInput[] = [
  {
    id: "sbi-ja-2026",
    organizationId: "sbi",
    examName: "Junior Associates (Customer Support & Sales)",
    recruitmentCycle: "2026-27",
    notificationId: "CRPD/CR/2026-27/17",
    notificationTitle: "Recruitment of Junior Associates (Customer Support & Sales)",
    notificationDate: "2026-08-11",
    applicationWindow: { opens: "2026-08-11", closes: "2026-08-31" },
    source: {
      url: "https://sbi.bank.in/webfiles/uploads/files_2627/08/JA_2026_Detailed_Advt_Eng.pdf",
      title: "Detailed Advertisement CRPD/CR/2026-27/17 (English)",
      publisher: "State Bank of India, Central Recruitment & Promotion Department",
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      "Pixel dimensions are marked “preferred” in the advertisement.",
      "A live photograph is also captured during the application.",
      "Image files must be JPG or JPEG.",
    ],
    documents: sbiDocuments("Annexure-II"),
  },
  {
    id: "sbi-po-2025",
    organizationId: "sbi",
    examName: "Probationary Officers",
    recruitmentCycle: "2025-26",
    notificationId: "CRPD/PO/2025-26/04",
    notificationTitle: "Recruitment of Probationary Officers",
    notificationDate: "2025-06-23",
    applicationWindow: { opens: "2025-06-24", closes: "2025-07-14" },
    source: {
      url: "https://sbi.bank.in/documents/77530/52947104/1_Detailed_Adv.2025_23.06.2025.pdf",
      title: "Detailed Advertisement CRPD/PO/2025-26/04",
      publisher: "State Bank of India, Central Recruitment & Promotion Department",
    },
    lastVerified: "2026-10-29",
    verificationStatus: "source-cited",
    notes: [
      "This recruitment has closed. A newer PO advertisement may change these specifications.",
      "Pixel dimensions are marked “preferred” in the advertisement.",
      "A live photograph is also captured during the application.",
    ],
    documents: sbiDocuments("Annexure II"),
  },
];
