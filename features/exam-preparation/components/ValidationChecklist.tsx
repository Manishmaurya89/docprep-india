"use client";

import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import { type Finding, summarizeFindings } from "../validate";

const STYLE = {
  pass: { icon: "check", color: "text-success", label: "passed" },
  fail: { icon: "x", color: "text-danger", label: "failed" },
  manual: { icon: "help", color: "text-warning", label: "manual" },
} as const;

/** Pass / fail / manual-check list for a produced file. */
export function ValidationChecklist({ findings }: { findings: Finding[] }) {
  const { t } = useI18n();
  const v = t.validation;
  const summary = summarizeFindings(findings);
  return (
    <div className="space-y-2" data-testid="validation-report" data-failed={summary.failed} data-passed={summary.passed} data-manual={summary.manual}>
      <p className="text-sm font-medium text-fg" role="status">
        {summary.failed ? v.notMet(summary.failed) : v.allMet(summary.passed)}
        {summary.manual ? v.toCheck(summary.manual) : ""}
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {findings.map((finding) => {
          const style = STYLE[finding.status];
          return (
            <li key={finding.id} className="flex gap-3 bg-surface px-3 py-2 text-sm" data-finding={finding.id} data-status={finding.status}>
              <Icon name={style.icon} className={cn("mt-0.5 h-4 w-4 shrink-0", style.color)} />
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  <span className="sr-only">{v[style.label]}: </span>
                  {finding.label}
                </p>
                <p className="text-xs text-fg-muted">{finding.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
