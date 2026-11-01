import type { ApplicationSpec, VerificationStatus } from "@/data/exam-requirements/schema";
import { type UiMessages, enUi } from "@/lib/i18n/en";

export type WarningLevel = "danger" | "warning" | "info";

export interface SpecWarning {
  code: "example" | "unverified" | "source-cited" | "missing-source" | "stale" | "never-checked" | "user-entered" | "window-closed";
  level: WarningLevel;
  message: string;
}

/** Requirements checked more than this long ago are flagged as possibly outdated. */
export const STALE_AFTER_DAYS = 365;

/** English labels; other languages use `t.status.labels`. */
export const STATUS_LABELS: Record<VerificationStatus, string> = enUi.status.labels;

export const STATUS_TONES: Record<VerificationStatus, "success" | "accent" | "warning" | "danger"> = {
  verified: "success",
  "source-cited": "accent",
  unverified: "warning",
  example: "danger",
  "user-entered": "accent",
};

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.floor((to.getTime() - from) / 86_400_000);
}

type StatusFields = Pick<ApplicationSpec, "verificationStatus" | "source" | "lastVerified"> & Partial<Pick<ApplicationSpec, "applicationWindow">>;

export function getSpecWarnings(spec: StatusFields, today = new Date(), t: UiMessages = enUi): SpecWarning[] {
  const m = t.status;
  const warnings: SpecWarning[] = [];
  switch (spec.verificationStatus) {
    case "example":
      warnings.push({
        code: "example",
        level: "danger",
        message: m.example,
      });
      break;
    case "unverified":
      warnings.push({
        code: "unverified",
        level: "warning",
        message: m.unverified,
      });
      break;
    case "source-cited":
      warnings.push({
        code: "source-cited",
        level: "info",
        message: m.sourceCited,
      });
      break;
    case "user-entered":
      warnings.push({
        code: "user-entered",
        level: "info",
        message: m.userEntered,
      });
      break;
    case "verified":
      break;
  }
  if (!spec.source && spec.verificationStatus !== "user-entered") {
    warnings.push({ code: "missing-source", level: "warning", message: m.missingSource });
  }
  if (spec.verificationStatus !== "user-entered" && spec.verificationStatus !== "example") {
    if (!spec.lastVerified) {
      warnings.push({ code: "never-checked", level: "warning", message: m.neverChecked });
    } else if (daysBetween(spec.lastVerified, today) > STALE_AFTER_DAYS) {
      warnings.push({
        code: "stale",
        level: "warning",
        message: m.stale(spec.lastVerified),
      });
    }
  }
  if (spec.applicationWindow && daysBetween(spec.applicationWindow.closes, today) > 0) {
    warnings.push({
      code: "window-closed",
      level: "info",
      message: m.windowClosed(spec.applicationWindow.closes),
    });
  }
  return warnings;
}

/** True only for verified, sourced, recently checked records. */
export function isTrustworthy(spec: StatusFields, today = new Date()): boolean {
  return spec.verificationStatus === "verified" && getSpecWarnings(spec, today).length === 0;
}
