import { describe, expect, it } from "vitest";
import { getSpec } from "@/data/exam-requirements";
import { documentRequirementSchema } from "@/data/exam-requirements/schema";
import { describePixels, describeSize, planImageOutput } from "@/features/exam-preparation/plan";
import { getSpecWarnings, isTrustworthy } from "@/features/exam-preparation/spec-status";
import { maxKBToBytes, minKBToBytes } from "@/lib/file-processing/size-limits";
import { isA4, summarizeFindings, validateAgainstRequirement } from "@/features/exam-preparation/validate";

const requirement = (input: Parameters<typeof documentRequirementSchema.parse>[0]) => documentRequirementSchema.parse(input);
const photo = requirement({
  id: "photo",
  type: "photograph",
  label: "Photo",
  required: "required",
  kind: "image",
  formats: ["jpeg"],
  fileSize: { minKB: 20, maxKB: 50 },
  pixels: { width: 200, height: 230 },
  conditions: ["White background"],
});

const statusOf = (findings: ReturnType<typeof validateAgainstRequirement>, id: string) => findings.find((f) => f.id === id)?.status;

describe("KB interpretation", () => {
  it("uses the stricter reading for each limit", () => {
    expect(maxKBToBytes(50)).toBe(50_000);
    expect(minKBToBytes(20)).toBe(20_480);
  });
});

describe("validateAgainstRequirement", () => {
  it("passes a file that meets every measurable rule and leaves visual rules as manual checks", () => {
    const findings = validateAgainstRequirement({ format: "jpeg", size: 35_000, width: 200, height: 230 }, photo);
    expect(statusOf(findings, "format")).toBe("pass");
    expect(statusOf(findings, "max-size")).toBe("pass");
    expect(statusOf(findings, "min-size")).toBe("pass");
    expect(statusOf(findings, "pixels")).toBe("pass");
    expect(statusOf(findings, "condition-0")).toBe("manual");
    expect(summarizeFindings(findings)).toEqual({ passed: 4, failed: 0, manual: 1, measurablePass: true });
  });

  it("fails each rule that is not met", () => {
    const findings = validateAgainstRequirement({ format: "png", size: 50_500, width: 201, height: 230 }, photo);
    expect(statusOf(findings, "format")).toBe("fail");
    // 50,500 bytes is under 50 KiB but over 50,000 bytes, so it fails the strict reading.
    expect(statusOf(findings, "max-size")).toBe("fail");
    expect(statusOf(findings, "pixels")).toBe("fail");
    expect(summarizeFindings(findings).measurablePass).toBe(false);
  });

  it("fails files below the minimum under the strict reading", () => {
    const findings = validateAgainstRequirement({ format: "jpeg", size: 20_200, width: 200, height: 230 }, photo);
    expect(statusOf(findings, "min-size")).toBe("fail");
  });

  it("treats preferred dimensions as a manual decision, not a failure", () => {
    const ibpsSignature = getSpec("ibps-crp-po-mt-xvi")!.documents.find((d) => d.id === "signature")!;
    expect(statusOf(validateAgainstRequirement({ format: "jpeg", size: 15_000, width: 140, height: 60 }, ibpsSignature), "pixels")).toBe("pass");
    const enlarged = validateAgainstRequirement({ format: "jpeg", size: 15_000, width: 280, height: 120 }, ibpsSignature);
    expect(statusOf(enlarged, "pixels")).toBe("manual");
    expect(enlarged.find((f) => f.id === "pixels")!.detail).toMatch(/preferred/);
  });

  it("checks minimum pixel sizes and exclusive limits (RRB)", () => {
    const rrb = getSpec("rrb-ntpc-graduate-cen-06-2025")!;
    const signature = rrb.documents.find((d) => d.id === "signature")!;
    expect(statusOf(validateAgainstRequirement({ format: "jpeg", size: 40_000, width: 139, height: 80 }, signature), "pixels")).toBe("fail");
    expect(statusOf(validateAgainstRequirement({ format: "jpeg", size: 40_000, width: 400, height: 160 }, signature), "pixels")).toBe("pass");
    const certificate = rrb.documents.find((d) => d.id === "sc-st-certificate")!;
    expect(statusOf(validateAgainstRequirement({ format: "pdf", size: 400_000, pageCount: 1 }, certificate), "max-size")).toBe("fail");
    expect(statusOf(validateAgainstRequirement({ format: "pdf", size: 399_999, pageCount: 1 }, certificate), "max-size")).toBe("pass");
  });

  it("checks A4 page size for PDFs", () => {
    const certificate = getSpec("ibps-crp-po-mt-xvi")!.documents.find((d) => d.id === "class-10-certificate")!;
    const a4 = { width: 595.28, height: 841.89 };
    expect(statusOf(validateAgainstRequirement({ format: "pdf", size: 100_000, pageCount: 2, pageSizesPt: [a4, { width: 841.89, height: 595.28 }] }, certificate), "page-size")).toBe("pass");
    expect(statusOf(validateAgainstRequirement({ format: "pdf", size: 100_000, pageCount: 1, pageSizesPt: [{ width: 612, height: 792 }] }, certificate), "page-size")).toBe("fail");
    expect(isA4({ width: 596, height: 842 })).toBe(true);
  });

  it("reports unspecified formats and source gaps as manual checks", () => {
    const upscPhoto = getSpec("upsc-cse-2026")!.documents.find((d) => d.id === "photograph")!;
    const findings = validateAgainstRequirement({ format: "jpeg", size: 30_000, width: 300, height: 400 }, upscPhoto);
    expect(statusOf(findings, "format")).toBe("manual");
    expect(statusOf(findings, "gap-0")).toBe("manual");
    expect(findings.some((f) => f.status === "fail")).toBe(false);
  });

  it("has nothing to validate for live-capture items", () => {
    const live = getSpec("ssc-cgl-2026")!.documents.find((d) => d.kind === "live-capture")!;
    expect(validateAgainstRequirement({ format: "jpeg", size: 1 }, live)).toEqual([]);
  });
});

describe("getSpecWarnings", () => {
  const today = new Date("2026-10-29T00:00:00Z");

  it("warns about examples, unverified and unreviewed records", () => {
    expect(getSpecWarnings({ verificationStatus: "example", source: null, lastVerified: null }, today).map((w) => w.code)).toEqual(["example", "missing-source"]);
    expect(getSpecWarnings({ verificationStatus: "unverified", source: null, lastVerified: null }, today).map((w) => w.code)).toEqual([
      "unverified",
      "missing-source",
      "never-checked",
    ]);
    const cited = getSpecWarnings(getSpec("ibps-crp-po-mt-xvi")!, today);
    expect(cited.map((w) => w.code)).toContain("source-cited");
  });

  it("flags stale checks and closed application windows", () => {
    const source = { url: "https://ssc.gov.in/x.pdf", title: "x", publisher: "SSC" };
    const stale = getSpecWarnings({ verificationStatus: "verified", source, lastVerified: "2025-01-01" }, today);
    expect(stale.map((w) => w.code)).toEqual(["stale"]);
    const closed = getSpecWarnings({ verificationStatus: "verified", source, lastVerified: "2026-10-01", applicationWindow: { opens: "2026-01-01", closes: "2026-02-01" } }, today);
    expect(closed.map((w) => w.code)).toEqual(["window-closed"]);
    expect(isTrustworthy({ verificationStatus: "verified", source, lastVerified: "2026-10-01" }, today)).toBe(true);
    expect(isTrustworthy({ verificationStatus: "source-cited", source, lastVerified: "2026-10-01" }, today)).toBe(false);
  });

  it("does not ask users to verify their own custom preset against a registry source", () => {
    expect(getSpecWarnings({ verificationStatus: "user-entered", source: null, lastVerified: null }, today).map((w) => w.code)).toEqual(["user-entered"]);
  });
});

describe("planImageOutput", () => {
  it("locks the aspect ratio for exact sizes", () => {
    expect(planImageOutput({ width: 1000, height: 1200 }, { width: 200, height: 230 })).toMatchObject({
      output: { width: 200, height: 230 },
      aspect: 200 / 230,
      allowResize: false,
    });
  });

  it("scales uniformly into a range and keeps minimums", () => {
    const plan = planImageOutput({ width: 2000, height: 800 }, { minWidth: 140, minHeight: 60 });
    expect(plan.output).toEqual({ width: 2000, height: 800 });
    expect(plan.allowResize).toBe(true);
    expect(plan.minScale).toBeCloseTo(0.1, 5); // max(140/2000, 60/800, floor 0.1)
    const small = planImageOutput({ width: 100, height: 40 }, { minWidth: 140, minHeight: 60 });
    expect(small.output.width).toBeGreaterThanOrEqual(140);
    expect(small.output.height).toBeGreaterThanOrEqual(60);
    expect(small.output.width / small.output.height).toBeCloseTo(2.5, 1);
    const capped = planImageOutput({ width: 3000, height: 3000 }, { maxWidth: 1000, maxHeight: 1000 });
    expect(capped.output).toEqual({ width: 1000, height: 1000 });
  });

  it("describes requirements for display", () => {
    expect(describePixels({ width: 200, height: 230, preferred: true })).toBe("200 × 230 px (preferred)");
    expect(describePixels({ minWidth: 140, minHeight: 60, dpi: 100 })).toBe("at least 140 × 60 px at 100 DPI");
    expect(describeSize({ minKB: 30, maxKB: 49 })).toBe("30–49 KB");
    expect(describeSize({ maxKB: 400, maxExclusive: true })).toBe("less than 400 KB");
  });
});
