const KIB = 1024;

/** Human-readable size using 1 KB = 1024 bytes (how Windows reports sizes). */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < KIB) return `${bytes} B`;
  if (bytes < KIB * KIB) return `${(bytes / KIB).toFixed(fractionDigits)} KB`;
  return `${(bytes / (KIB * KIB)).toFixed(fractionDigits)} MB`;
}

/** Words used by the formatters below, in English; lib/i18n/hi.ts has the Hindi version. */
export const FORMAT_TEXT = {
  exactBytes: (grouped: string) => `${grouped} bytes`,
  noChange: "No change",
  smaller: (percent: string) => `${percent}% smaller`,
  larger: (percent: string) => `${percent}% larger`,
};
export type FormatText = typeof FORMAT_TEXT;

/** Indian digit grouping (12,34,567), used in every language. */
export function groupDigits(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatExactBytes(bytes: number, text: FormatText = FORMAT_TEXT): string {
  return text.exactBytes(groupDigits(bytes));
}

/** Positive = smaller output. */
export function percentReduction(original: number, output: number): number {
  if (original <= 0) return 0;
  return ((original - output) / original) * 100;
}

export function formatReduction(original: number, output: number, text: FormatText = FORMAT_TEXT): string {
  const pct = percentReduction(original, output);
  if (Math.abs(pct) < 0.05) return text.noChange;
  return pct > 0 ? text.smaller(pct.toFixed(1)) : text.larger(Math.abs(pct).toFixed(1));
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height} px`;
}

export type SizeUnit = "KB" | "MB";

export function toBytes(value: number, unit: SizeUnit): number {
  return Math.round(value * (unit === "KB" ? KIB : KIB * KIB));
}
