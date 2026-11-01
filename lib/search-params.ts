export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses an optional positive number from a query parameter, ignoring anything invalid. */
export function positiveNumberParam(value: string | string[] | undefined, max = 100_000): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
}

export function enumParam<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  const raw = first(value);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}
