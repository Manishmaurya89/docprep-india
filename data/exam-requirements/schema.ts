import { z } from "zod";

/**
 * Structured, sourced requirement records. Every value shown to users as a
 * requirement comes from a record that passes this schema.
 *
 * Verification statuses:
 *  - verified      A maintainer compared every value with the official source on `lastVerified`.
 *  - source-cited  Values were transcribed from the cited official document but have not yet
 *                  been independently re-checked by a second person.
 *  - unverified    Entered manually; the official source has not been confirmed.
 *  - example       An illustrative preset. Not an official requirement of any body.
 *  - user-entered  Built in the browser from values the user typed (never stored in the registry).
 */
import { DOCUMENT_TYPES, VERIFICATION_STATUSES } from "./constants";

export { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, VERIFICATION_STATUSES } from "./constants";
export type { DocumentType, VerificationStatus } from "./constants";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const httpsUrl = z.url().refine((value) => value.startsWith("https://"), "Sources must use https://");

export const fileSizeSchema = z
  .object({
    minKB: z.number().positive().optional(),
    maxKB: z.number().positive().optional(),
    /** The source says "less than" rather than "up to". */
    maxExclusive: z.boolean().optional(),
  })
  .refine((v) => v.minKB !== undefined || v.maxKB !== undefined, "Give minKB, maxKB or both")
  .refine((v) => v.minKB === undefined || v.maxKB === undefined || v.minKB <= v.maxKB, "minKB must not exceed maxKB");

export const pixelSchema = z
  .object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    minWidth: z.number().int().positive().optional(),
    maxWidth: z.number().int().positive().optional(),
    minHeight: z.number().int().positive().optional(),
    maxHeight: z.number().int().positive().optional(),
    /** The source calls these dimensions "preferred" rather than mandatory. */
    preferred: z.boolean().optional(),
    /** Scanning resolution stated alongside the dimensions, if any. */
    dpi: z.number().int().positive().optional(),
  })
  .refine(
    (v) => [v.width, v.height, v.minWidth, v.maxWidth, v.minHeight, v.maxHeight].some((x) => x !== undefined),
    "Give at least one pixel constraint",
  )
  .refine(
    (v) => !(v.width !== undefined && (v.minWidth !== undefined || v.maxWidth !== undefined)),
    "Use either an exact width or a width range",
  )
  .refine(
    (v) => !(v.height !== undefined && (v.minHeight !== undefined || v.maxHeight !== undefined)),
    "Use either an exact height or a height range",
  )
  .refine((v) => v.minWidth === undefined || v.maxWidth === undefined || v.minWidth <= v.maxWidth, "minWidth > maxWidth")
  .refine((v) => v.minHeight === undefined || v.maxHeight === undefined || v.minHeight <= v.maxHeight, "minHeight > maxHeight");

export const documentRequirementSchema = z
  .object({
    id: slug,
    type: z.enum(DOCUMENT_TYPES),
    label: z.string().min(1),
    required: z.enum(["required", "conditional", "optional"]),
    condition: z.string().optional(),
    /**
     * image / pdf: a file the candidate prepares and uploads.
     * live-capture: taken by webcam or phone inside the application itself; it cannot be prepared here.
     */
    kind: z.enum(["image", "pdf", "live-capture"]),
    /** Empty when the source does not state a format (see specificationGaps). */
    formats: z.array(z.enum(["jpeg", "png", "pdf"])).default([]),
    fileSize: fileSizeSchema.optional(),
    pixels: pixelSchema.optional(),
    physical: z
      .object({
        widthMm: z.number().positive(),
        heightMm: z.number().positive(),
        /** The source says "about" or "approximately". */
        approximate: z.boolean().optional(),
      })
      .optional(),
    /** Required page size for PDFs. */
    pageSize: z.enum(["a4"]).optional(),
    /** Further official conditions, paraphrased. Shown as manual checks. */
    conditions: z.array(z.string().min(1)).default([]),
    /** Things the cited source does not specify, or specifies inconsistently. Shown as warnings. */
    specificationGaps: z.array(z.string().min(1)).default([]),
    /** Where in the source document this appears (section, annexure, page). */
    sourceReference: z.string().optional(),
  })
  .refine((v) => v.kind !== "pdf" || v.formats.every((f) => f === "pdf"), "PDF requirements may only list the pdf format")
  .refine((v) => v.kind !== "image" || v.formats.every((f) => f !== "pdf"), "Image requirements may not list pdf")
  .refine(
    (v) => v.kind !== "live-capture" || (v.formats.length === 0 && !v.fileSize && !v.pixels),
    "Live-capture items have no file specifications",
  )
  .refine((v) => v.kind === "live-capture" || v.formats.length > 0 || v.specificationGaps.length > 0, "Give formats or explain the gap")
  .refine((v) => v.kind === "pdf" || !v.pageSize, "Only PDF requirements can have a page size")
  .refine((v) => v.required !== "conditional" || Boolean(v.condition), "Conditional documents need a condition");

export type DocumentRequirement = z.infer<typeof documentRequirementSchema>;
export type DocumentRequirementInput = z.input<typeof documentRequirementSchema>;

export const sourceSchema = z.object({
  url: httpsUrl,
  title: z.string().min(1),
  /** The official body that published it. */
  publisher: z.string().min(1),
});

export const applicationSpecSchema = z
  .object({
    id: slug,
    organizationId: slug,
    examName: z.string().min(1),
    /** e.g. "2025" or "2025-26". */
    recruitmentCycle: z.string().min(1),
    notificationId: z.string().min(1).nullable(),
    notificationTitle: z.string().min(1),
    notificationDate: isoDate.nullable(),
    /** Online application window as stated in the source (including corrigenda). */
    applicationWindow: z.object({ opens: isoDate, closes: isoDate }).optional(),
    source: sourceSchema.nullable(),
    lastVerified: isoDate.nullable(),
    verificationStatus: z.enum(VERIFICATION_STATUSES),
    verifiedBy: z.string().optional(),
    notes: z.array(z.string()).default([]),
    documents: z.array(documentRequirementSchema).min(1),
  })
  .superRefine((spec, ctx) => {
    if ((spec.verificationStatus === "verified" || spec.verificationStatus === "source-cited") && !spec.source) {
      ctx.addIssue({ code: "custom", path: ["source"], message: `A ${spec.verificationStatus} record must cite its official source` });
    }
    if ((spec.verificationStatus === "verified" || spec.verificationStatus === "source-cited") && !spec.lastVerified) {
      ctx.addIssue({ code: "custom", path: ["lastVerified"], message: "Record when the source was last checked" });
    }
    if (spec.verificationStatus === "verified" && !spec.verifiedBy) {
      ctx.addIssue({ code: "custom", path: ["verifiedBy"], message: "Verified records must name who verified them" });
    }
    if (spec.verificationStatus === "user-entered") {
      ctx.addIssue({ code: "custom", path: ["verificationStatus"], message: "user-entered is reserved for in-browser custom presets" });
    }
    const ids = new Set<string>();
    spec.documents.forEach((doc, i) => {
      if (ids.has(doc.id)) ctx.addIssue({ code: "custom", path: ["documents", i, "id"], message: `Duplicate document id ${doc.id}` });
      ids.add(doc.id);
    });
  });

export type ApplicationSpec = z.infer<typeof applicationSpecSchema>;
export type ApplicationSpecInput = z.input<typeof applicationSpecSchema>;

export const organizationSchema = z.object({
  id: slug,
  shortName: z.string().min(1),
  name: z.string().min(1),
  /** Official website, or null when no single verified site exists. */
  website: httpsUrl.nullable(),
  description: z.string().min(1),
});

export type Organization = z.infer<typeof organizationSchema>;
