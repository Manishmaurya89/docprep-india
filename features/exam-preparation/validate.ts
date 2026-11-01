import type { DetectedFormat } from "@/lib/file-processing/detect";
import { FORMAT_LABELS } from "@/lib/file-processing/detect";
import { formatBytes, formatExactBytes } from "@/lib/file-processing/format";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { formatKB, maxKBToBytes, minKBToBytes } from "@/lib/file-processing/size-limits";
import { type UiMessages, enUi } from "@/lib/i18n/en";

export type FindingStatus = "pass" | "fail" | "manual";

export interface Finding {
  id: string;
  label: string;
  status: FindingStatus;
  detail: string;
}

/** Properties measured from the produced file's bytes — never from settings. */
export interface MeasuredFile {
  format: DetectedFormat;
  size: number;
  width?: number;
  height?: number;
  pageCount?: number;
  /** PDF page sizes in points (1/72 inch), in page order. */
  pageSizesPt?: { width: number; height: number }[];
}

const A4_PT = { width: 595.28, height: 841.89 };
const PAGE_TOLERANCE_PT = 3;

export function isA4(size: { width: number; height: number }): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) <= PAGE_TOLERANCE_PT;
  return (near(size.width, A4_PT.width) && near(size.height, A4_PT.height)) || (near(size.width, A4_PT.height) && near(size.height, A4_PT.width));
}

const FORMAT_NAMES: Record<"jpeg" | "png" | "pdf", string> = { jpeg: "JPG/JPEG", png: "PNG", pdf: "PDF" };

/** `t` is the page language's text (English by default). */
export function validateAgainstRequirement(measured: MeasuredFile, requirement: DocumentRequirement, t: UiMessages = enUi): Finding[] {
  const v = t.validation;
  const bytes = (value: number) => formatExactBytes(value, t.format);
  const findings: Finding[] = [];
  if (requirement.kind === "live-capture") return findings;

  if (requirement.formats.length === 0) {
    findings.push({
      id: "format",
      label: v.format,
      status: "manual",
      detail: v.formatNotStated(FORMAT_LABELS[measured.format]),
    });
  } else {
    const allowed = requirement.formats.map((f) => FORMAT_NAMES[f]).join(t.limits.or);
    const formatOk = (requirement.formats as string[]).includes(measured.format);
    findings.push({
      id: "format",
      label: v.formatAllowed(allowed),
      status: formatOk ? "pass" : "fail",
      detail: formatOk ? v.formatOk(FORMAT_LABELS[measured.format]) : v.formatBad(FORMAT_LABELS[measured.format]),
    });
  }

  const { fileSize } = requirement;
  if (fileSize?.maxKB !== undefined) {
    const limit = maxKBToBytes(fileSize.maxKB);
    const exclusive = fileSize.maxExclusive === true;
    const ok = exclusive ? measured.size < limit : measured.size <= limit;
    findings.push({
      id: "max-size",
      label: exclusive ? v.lessThan(formatKB(fileSize.maxKB)) : v.atMost(formatKB(fileSize.maxKB)),
      status: ok ? "pass" : "fail",
      detail: v.maxDetail(bytes(measured.size), formatBytes(measured.size), exclusive, bytes(limit)),
    });
  }
  if (fileSize?.minKB !== undefined) {
    const limit = minKBToBytes(fileSize.minKB);
    const ok = measured.size >= limit;
    findings.push({
      id: "min-size",
      label: v.atLeast(formatKB(fileSize.minKB)),
      status: ok ? "pass" : "fail",
      detail: v.minDetail(bytes(measured.size), bytes(limit), ok),
    });
  }

  const { pixels } = requirement;
  if (pixels && requirement.kind === "image") {
    const { width, height } = measured;
    if (width === undefined || height === undefined) {
      findings.push({ id: "pixels", label: v.pixels, status: "fail", detail: v.pixelsUnreadable });
    } else {
      const checks: [string, boolean][] = [];
      if (pixels.width !== undefined) checks.push([v.width(pixels.width), width === pixels.width]);
      if (pixels.height !== undefined) checks.push([v.height(pixels.height), height === pixels.height]);
      if (pixels.minWidth !== undefined) checks.push([v.minWidth(pixels.minWidth), width >= pixels.minWidth]);
      if (pixels.maxWidth !== undefined) checks.push([v.maxWidth(pixels.maxWidth), width <= pixels.maxWidth]);
      if (pixels.minHeight !== undefined) checks.push([v.minHeight(pixels.minHeight), height >= pixels.minHeight]);
      if (pixels.maxHeight !== undefined) checks.push([v.maxHeight(pixels.maxHeight), height <= pixels.maxHeight]);
      const failed = checks.filter(([, ok]) => !ok).map(([text]) => text);
      const preferred = pixels.preferred === true;
      findings.push({
        id: "pixels",
        label: v.dimensions(checks.map(([text]) => text).join(", "), preferred),
        // "Preferred" sizes are guidance in the source, so a mismatch needs a human decision, not a hard fail.
        status: failed.length ? (preferred ? "manual" : "fail") : "pass",
        detail: v.dimensionsDetail(width, height, failed.length ? failed.join(", ") : null, preferred),
      });
    }
  }

  if (requirement.physical) {
    findings.push({
      id: "physical",
      label: v.physical(requirement.physical.approximate === true, requirement.physical.widthMm / 10, requirement.physical.heightMm / 10),
      status: "manual",
      detail: v.physicalDetail(Boolean(pixels)),
    });
  }

  if (requirement.kind === "pdf" && measured.pageCount !== undefined) {
    findings.push({
      id: "pages",
      label: v.readablePdf,
      status: measured.pageCount > 0 ? "pass" : "fail",
      detail: v.pagesDetail(measured.pageCount),
    });
  }

  if (requirement.kind === "pdf" && requirement.pageSize === "a4") {
    const sizes = measured.pageSizesPt ?? [];
    const off = sizes.map((size, i) => ({ size, page: i + 1 })).filter(({ size }) => !isA4(size));
    findings.push({
      id: "page-size",
      label: v.a4,
      status: sizes.length === 0 ? "manual" : off.length ? "fail" : "pass",
      detail: sizes.length === 0 ? v.a4Unknown : off.length ? v.a4Off(off.map((o) => o.page)) : v.a4Ok(sizes.length),
    });
  }

  requirement.specificationGaps.forEach((gap, i) => {
    findings.push({ id: `gap-${i}`, label: v.gap, status: "manual", detail: gap });
  });

  requirement.conditions.forEach((condition, i) => {
    findings.push({ id: `condition-${i}`, label: condition, status: "manual", detail: v.conditionDetail });
  });

  return findings;
}

export interface FindingSummary {
  passed: number;
  failed: number;
  manual: number;
  /** True when nothing measurable failed. Manual checks still need the user's attention. */
  measurablePass: boolean;
}

export function summarizeFindings(findings: Finding[]): FindingSummary {
  const passed = findings.filter((f) => f.status === "pass").length;
  const failed = findings.filter((f) => f.status === "fail").length;
  const manual = findings.filter((f) => f.status === "manual").length;
  return { passed, failed, manual, measurablePass: failed === 0 };
}
