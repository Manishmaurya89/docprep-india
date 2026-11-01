import { type ApplicationSpec, type DocumentRequirement, type DocumentType, documentRequirementSchema } from "@/data/exam-requirements/schema";
import { type UiMessages, enUi } from "@/lib/i18n/en";

export interface DraftDocument {
  key: string;
  label: string;
  type: DocumentType;
  kind: "image" | "pdf";
  jpeg: boolean;
  png: boolean;
  minKB: string;
  maxKB: string;
  dimensions: "exact" | "minimum" | "none";
  width: string;
  height: string;
}

let keyCounter = 0;
export function newDraft(partial: Partial<DraftDocument> = {}): DraftDocument {
  return {
    key: `draft-${++keyCounter}`,
    label: "Photograph",
    type: "photograph",
    kind: "image",
    jpeg: true,
    png: false,
    minKB: "",
    maxKB: "",
    dimensions: "none",
    width: "",
    height: "",
    ...partial,
  };
}

function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || fallback;
}

const num = (value: string) => (value.trim() === "" ? undefined : Number(value));

export type DraftResult = { ok: true; requirement: DocumentRequirement } | { ok: false; errors: string[] };

/** Converts a user's form entry into a validated requirement (same schema as the registry). */
export function draftToRequirement(draft: DraftDocument, index: number, usedIds: Set<string>, t: UiMessages = enUi): DraftResult {
  const c = t.custom;
  const errors: string[] = [];
  const minKB = num(draft.minKB);
  const maxKB = num(draft.maxKB);
  const width = num(draft.width);
  const height = num(draft.height);
  for (const [name, value] of [[c.minSize, minKB], [c.maxSize, maxKB], [t.common.width, width], [t.common.height, height]] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) errors.push(c.mustBePositive(name));
  }
  if ((width !== undefined && !Number.isInteger(width)) || (height !== undefined && !Number.isInteger(height))) errors.push(c.wholePixels);
  if (draft.dimensions !== "none" && (width === undefined || height === undefined)) errors.push(c.bothDimensions);
  if (draft.kind === "image" && !draft.jpeg && !draft.png) errors.push(c.oneFormat);
  if (errors.length) return { ok: false, errors };

  // Labels in other scripts (e.g. "फोटो") give no Latin slug, so the file is named after the document type.
  let id = slugify(draft.label, draft.label.trim() ? draft.type : `document-${index + 1}`);
  while (usedIds.has(id)) id = `${id}-${index + 1}`;
  usedIds.add(id);

  const parsed = documentRequirementSchema.safeParse({
    id,
    type: draft.type,
    label: draft.label.trim() || c.documentNumber(index + 1),
    required: "required",
    kind: draft.kind,
    formats: draft.kind === "pdf" ? ["pdf"] : [...(draft.jpeg ? ["jpeg"] : []), ...(draft.png ? ["png"] : [])],
    fileSize: minKB !== undefined || maxKB !== undefined ? { minKB, maxKB } : undefined,
    pixels:
      draft.kind === "image" && draft.dimensions === "exact"
        ? { width, height }
        : draft.kind === "image" && draft.dimensions === "minimum"
          ? { minWidth: width, minHeight: height }
          : undefined,
    conditions: [],
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => (issue.message === "minKB must not exceed maxKB" ? c.minAboveMax : issue.message)) };
  }
  return { ok: true, requirement: parsed.data };
}

export function buildCustomSpec(drafts: DraftDocument[], t: UiMessages = enUi): { spec: ApplicationSpec | null; errors: Record<string, string[]> } {
  const used = new Set<string>();
  const errors: Record<string, string[]> = {};
  const documents: DocumentRequirement[] = [];
  drafts.forEach((draft, i) => {
    const result = draftToRequirement(draft, i, used, t);
    if (result.ok) documents.push(result.requirement);
    else errors[draft.key] = result.errors;
  });
  if (Object.keys(errors).length || documents.length === 0) return { spec: null, errors };
  return {
    spec: {
      id: "custom",
      organizationId: "other",
      examName: t.custom.examName,
      recruitmentCycle: "—",
      notificationId: null,
      notificationTitle: t.custom.notificationTitle,
      notificationDate: null,
      source: null,
      lastVerified: null,
      verificationStatus: "user-entered",
      notes: [],
      documents,
    },
    errors,
  };
}
