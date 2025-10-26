export function normalizeTimestamp(value: string | Date): string {
  const str = typeof value === 'string' ? value : value.toISOString();
  const trimmed = str.trim();
  const hasTimezone = /([+-]\d{2}:?\d{2}|Z)$/i.test(trimmed);
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const candidate = hasTimezone ? normalized : `${normalized}Z`;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
}

export function parseTimestamp(value: string | Date): Date {
  const iso = normalizeTimestamp(value);
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}
