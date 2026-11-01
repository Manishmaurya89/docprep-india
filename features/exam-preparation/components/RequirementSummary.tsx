"use client";

import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "@/components/ui/icons";
import { describePixels, describeSize } from "../plan";

const FORMAT_NAMES = { jpeg: "JPG / JPEG", png: "PNG", pdf: "PDF" } as const;

/** What the source says about one document, in plain terms. */
export function RequirementSummary({ requirement }: { requirement: DocumentRequirement }) {
  const { t } = useI18n();
  const e = t.exam;
  const rows: [string, string][] = [];
  if (requirement.formats.length) rows.push([e.summaryFormat, requirement.formats.map((f) => FORMAT_NAMES[f]).join(t.limits.or)]);
  const size = describeSize(requirement.fileSize, t);
  if (size) rows.push([e.fileSize, size]);
  const pixels = describePixels(requirement.pixels, t);
  if (pixels) rows.push([e.dimensions, pixels]);
  if (requirement.physical) {
    rows.push([e.summaryPhysical, t.limits.physical(requirement.physical.approximate === true, requirement.physical.widthMm / 10, requirement.physical.heightMm / 10)]);
  }
  if (requirement.pageSize) rows.push([e.summaryPageSize, "A4"]);

  return (
    <div className="space-y-3 text-sm">
      {rows.length ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-fg-subtle">{label}</dt>
              <dd className="tabular font-medium text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {requirement.specificationGaps.map((gap) => (
        <p key={gap} className="flex gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-fg">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{gap}</span>
        </p>
      ))}
      {requirement.conditions.length ? (
        <div>
          <p className="mb-1 text-fg-subtle">{e.otherConditions}</p>
          <ul className="list-disc space-y-0.5 pl-5 text-fg-muted">
            {requirement.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {requirement.sourceReference ? <p className="text-xs text-fg-subtle">{e.source(requirement.sourceReference)}</p> : null}
    </div>
  );
}
