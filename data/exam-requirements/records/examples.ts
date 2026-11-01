import type { ApplicationSpecInput } from "../schema";

/**
 * Illustrative preset used to demonstrate the workflow and in tests.
 * It is NOT the requirement of any recruitment body and is always shown with
 * a prominent "example only" warning.
 */
export const EXAMPLE_RECORDS: ApplicationSpecInput[] = [
  {
    id: "example-photo-signature",
    organizationId: "other",
    examName: "Example preset: photo and signature",
    recruitmentCycle: "Example",
    notificationId: null,
    notificationTitle: "Example only — not an official notification",
    notificationDate: null,
    source: null,
    lastVerified: null,
    verificationStatus: "example",
    notes: ["Use this to try the tool. For a real application, choose your notification or enter its limits as a custom preset."],
    documents: [
      {
        id: "photograph",
        type: "photograph",
        label: "Photograph",
        required: "required",
        kind: "image",
        formats: ["jpeg"],
        fileSize: { minKB: 20, maxKB: 50 },
        pixels: { width: 200, height: 230 },
        conditions: ["Plain light background"],
      },
      {
        id: "signature",
        type: "signature",
        label: "Signature",
        required: "required",
        kind: "image",
        formats: ["jpeg"],
        fileSize: { minKB: 10, maxKB: 20 },
        pixels: { width: 140, height: 60 },
        conditions: ["Black ink on white paper"],
      },
    ],
  },
];
