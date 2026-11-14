import { describe, expect, it } from "vitest";
import { ORGANIZATIONS, RAW_RECORDS, REGISTRY_ISSUES, SPECS, buildRegistry, examsForOrganization, getSpec } from "@/data/exam-requirements";
import { type ApplicationSpecInput, applicationSpecSchema } from "@/data/exam-requirements/schema";

describe("requirements registry", () => {
  it("loads every bundled record without schema problems", () => {
    expect(REGISTRY_ISSUES).toEqual([]);
    expect(SPECS.length).toBe(RAW_RECORDS.length);
  });

  it("covers the initial organisations", () => {
    for (const id of ["ssc", "upsc", "ibps", "sbi", "rrb"]) {
      expect(examsForOrganization(id).length, id).toBeGreaterThan(0);
    }
  });

  it("cites an official https source for every non-example record, with dates", () => {
    // rrbapply.gov.in is the application portal the RRB notices themselves name (e.g. CEN 08/2026, page 4).
    const official = ["ssc.gov.in", "upsc.gov.in", "ibps.in", "sbi.bank.in", "rrbsecunderabad.gov.in", "rrbapply.gov.in"];
    for (const spec of SPECS.filter((s) => s.verificationStatus !== "example")) {
      expect(spec.source, spec.id).not.toBeNull();
      const host = new URL(spec.source!.url).hostname;
      expect(official.some((domain) => host === domain || host.endsWith(`.${domain}`)), `${spec.id}: ${host}`).toBe(true);
      expect(spec.lastVerified, spec.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(spec.notificationId, spec.id).toBeTruthy();
    }
  });

  it("never marks a record verified without naming who verified it", () => {
    for (const spec of SPECS) {
      if (spec.verificationStatus === "verified") expect(spec.verifiedBy).toBeTruthy();
    }
  });

  it("keeps example presets clearly separate from official records", () => {
    const examples = SPECS.filter((s) => s.verificationStatus === "example");
    expect(examples.length).toBeGreaterThan(0);
    for (const spec of examples) {
      expect(spec.source).toBeNull();
      expect(spec.organizationId).toBe("other");
      expect(spec.notificationTitle.toLowerCase()).toContain("not an official");
    }
  });

  it("records the transcribed IBPS PO/MT-XVI values", () => {
    const spec = getSpec("ibps-crp-po-mt-xvi")!;
    const photo = spec.documents.find((d) => d.id === "photograph")!;
    expect(photo).toMatchObject({ formats: ["jpeg"], fileSize: { minKB: 20, maxKB: 50 }, pixels: { width: 200, height: 230, preferred: true } });
    const declaration = spec.documents.find((d) => d.id === "handwritten-declaration")!;
    expect(declaration.fileSize).toEqual({ minKB: 50, maxKB: 100 });
    expect(spec.documents.find((d) => d.id === "class-10-certificate")).toMatchObject({ kind: "pdf", pageSize: "a4", fileSize: { maxKB: 500 } });
  });

  it("records the RRB signature minimums and exclusive certificate limit", () => {
    const spec = getSpec("rrb-ntpc-graduate-cen-06-2025")!;
    expect(spec.documents.find((d) => d.id === "signature")).toMatchObject({ fileSize: { minKB: 30, maxKB: 49 }, pixels: { minWidth: 140, minHeight: 60 } });
    expect(spec.documents.find((d) => d.id === "sc-st-certificate")).toMatchObject({ required: "conditional", fileSize: { maxKB: 400, maxExclusive: true } });
  });

  it("flags gaps instead of inventing values (UPSC and SSC)", () => {
    const upsc = getSpec("upsc-cse-2026")!;
    for (const doc of upsc.documents.filter((d) => d.kind === "image")) {
      expect(doc.fileSize).toBeUndefined();
      expect(doc.pixels).toBeUndefined();
      expect(doc.specificationGaps.length).toBeGreaterThan(0);
    }
    const cgl = getSpec("ssc-cgl-2026")!;
    expect(cgl.documents.find((d) => d.id === "live-photograph")?.kind).toBe("live-capture");
    expect(cgl.documents.find((d) => d.id === "signature")?.specificationGaps.join(" ")).toMatch(/6\.0 cm.*4\.0 cm/);
  });

  it("exposes only known organisations", () => {
    const ids = new Set(ORGANIZATIONS.map((o) => o.id));
    for (const spec of SPECS) expect(ids.has(spec.organizationId)).toBe(true);
  });
});

describe("schema guards", () => {
  const base: ApplicationSpecInput = {
    id: "test-spec",
    organizationId: "other",
    examName: "Test",
    recruitmentCycle: "2026",
    notificationId: "T/1",
    notificationTitle: "Test",
    notificationDate: "2026-01-01",
    source: { url: "https://example.gov.in/n.pdf", title: "Notice", publisher: "Test body" },
    lastVerified: "2026-01-02",
    verificationStatus: "source-cited",
    documents: [{ id: "photo", type: "photograph", label: "Photo", required: "required", kind: "image", formats: ["jpeg"], fileSize: { maxKB: 50 } }],
  };

  it("accepts a valid record", () => {
    expect(applicationSpecSchema.safeParse(base).success).toBe(true);
  });

  it("rejects cited or verified records without a source", () => {
    expect(applicationSpecSchema.safeParse({ ...base, source: null }).success).toBe(false);
    expect(applicationSpecSchema.safeParse({ ...base, verificationStatus: "verified" }).success).toBe(false); // no verifiedBy
    expect(applicationSpecSchema.safeParse({ ...base, verificationStatus: "verified", verifiedBy: "Maintainer" }).success).toBe(true);
  });

  it("rejects insecure sources, inverted ranges and impossible combinations", () => {
    expect(applicationSpecSchema.safeParse({ ...base, source: { ...base.source!, url: "http://example.gov.in/n.pdf" } }).success).toBe(false);
    const doc = base.documents[0]!;
    const withDoc = (patch: object) => ({ ...base, documents: [{ ...doc, ...patch }] });
    expect(applicationSpecSchema.safeParse(withDoc({ fileSize: { minKB: 60, maxKB: 50 } })).success).toBe(false);
    expect(applicationSpecSchema.safeParse(withDoc({ formats: ["pdf"] })).success).toBe(false);
    expect(applicationSpecSchema.safeParse(withDoc({ formats: [] })).success).toBe(false); // no format and no stated gap
    expect(applicationSpecSchema.safeParse(withDoc({ pixels: { width: 200, minWidth: 100 } })).success).toBe(false);
    expect(applicationSpecSchema.safeParse(withDoc({ required: "conditional" })).success).toBe(false);
    expect(applicationSpecSchema.safeParse(withDoc({ kind: "live-capture" })).success).toBe(false);
    expect(applicationSpecSchema.safeParse({ ...base, verificationStatus: "user-entered" }).success).toBe(false);
  });

  it("excludes invalid records from the registry and reports why", () => {
    const { specs, issues } = buildRegistry([base, { ...base, id: "broken", source: null }, { ...base }]);
    expect(specs.map((s) => s.id)).toEqual(["test-spec"]);
    expect(issues.map((i) => i.id)).toEqual(["broken", "test-spec"]);
    expect(issues[1]!.problems.join()).toMatch(/duplicate/);
  });
});
