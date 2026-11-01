/**
 * Requirement constants without the zod dependency, so client components can
 * use them without shipping the schema validator to every page.
 */
export const VERIFICATION_STATUSES = ["verified", "source-cited", "unverified", "example", "user-entered"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "photograph",
  "signature",
  "left-thumb-impression",
  "handwritten-declaration",
  "category-certificate",
  "educational-certificate",
  "identity-proof",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  photograph: "Photograph",
  signature: "Signature",
  "left-thumb-impression": "Left thumb impression",
  "handwritten-declaration": "Handwritten declaration",
  "category-certificate": "Category / caste certificate",
  "educational-certificate": "Educational certificate",
  "identity-proof": "Identity proof",
  other: "Other document",
};
