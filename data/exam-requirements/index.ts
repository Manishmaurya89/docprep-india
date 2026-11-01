import { ORGANIZATIONS } from "./organizations";
import { EXAMPLE_RECORDS } from "./records/examples";
import { IBPS_RECORDS } from "./records/ibps";
import { RRB_RECORDS } from "./records/rrb";
import { SBI_RECORDS } from "./records/sbi";
import { SSC_RECORDS } from "./records/ssc";
import { UPSC_RECORDS } from "./records/upsc";
import { type ApplicationSpec, type ApplicationSpecInput, type Organization, applicationSpecSchema, organizationSchema } from "./schema";

export const RAW_RECORDS: readonly ApplicationSpecInput[] = [
  ...SSC_RECORDS,
  ...UPSC_RECORDS,
  ...IBPS_RECORDS,
  ...SBI_RECORDS,
  ...RRB_RECORDS,
  ...EXAMPLE_RECORDS,
];

export interface RegistryIssue {
  id: string;
  problems: string[];
}

/**
 * Validates every record against the schema. Invalid records are excluded and
 * reported (never shown with partial data). Unit tests fail on any issue.
 */
export function buildRegistry(records: readonly ApplicationSpecInput[], organizations: readonly Organization[] = ORGANIZATIONS) {
  const orgIds = new Set(organizations.map((org) => organizationSchema.parse(org).id));
  const specs: ApplicationSpec[] = [];
  const issues: RegistryIssue[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    const parsed = applicationSpecSchema.safeParse(record);
    const id = typeof record.id === "string" ? record.id : "(missing id)";
    const problems = parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`);
    if (parsed.success && !orgIds.has(parsed.data.organizationId)) problems.push(`organizationId: unknown organisation ${parsed.data.organizationId}`);
    if (seen.has(id)) problems.push("id: duplicate record id");
    seen.add(id);
    if (problems.length || !parsed.success) issues.push({ id, problems });
    else specs.push(parsed.data);
  }
  return { specs, issues };
}

const registry = buildRegistry(RAW_RECORDS);

export const SPECS: readonly ApplicationSpec[] = registry.specs;
export const REGISTRY_ISSUES: readonly RegistryIssue[] = registry.issues;
export { ORGANIZATIONS };

export function getOrganization(id: string): Organization | undefined {
  return ORGANIZATIONS.find((org) => org.id === id);
}

export function specsForOrganization(organizationId: string): ApplicationSpec[] {
  return SPECS.filter((spec) => spec.organizationId === organizationId);
}

export function getSpec(id: string): ApplicationSpec | undefined {
  return SPECS.find((spec) => spec.id === id);
}

/** Groups an organisation's records by examination name, newest notification first. */
export function examsForOrganization(organizationId: string): { examName: string; specs: ApplicationSpec[] }[] {
  const groups = new Map<string, ApplicationSpec[]>();
  for (const spec of specsForOrganization(organizationId)) {
    groups.set(spec.examName, [...(groups.get(spec.examName) ?? []), spec]);
  }
  return [...groups.entries()].map(([examName, specs]) => ({
    examName,
    specs: specs.sort((a, b) => (b.notificationDate ?? "").localeCompare(a.notificationDate ?? "")),
  }));
}
