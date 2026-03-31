export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function formatPercent(value: unknown): string {
  const numeric = asNumber(value);
  if (numeric === null) {
    return "N/A";
  }
  return `${(numeric * 100).toFixed(1)}%`;
}

export function formatMetric(value: unknown, digits = 2): string {
  const numeric = asNumber(value);
  if (numeric !== null) {
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(digits);
  }
  const text = asText(value);
  return text ?? "N/A";
}

export function formatCompactNumber(value: unknown): string {
  const numeric = asNumber(value);
  if (numeric === null) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(numeric);
}

export function formatSignedMetric(value: unknown, digits = 1): string {
  const numeric = asNumber(value);
  if (numeric === null) {
    return "N/A";
  }
  const output = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(digits);
  return numeric > 0 ? `+${output}` : output;
}

export function formatSecondsToClock(value: unknown): string {
  const numeric = asNumber(value);
  if (numeric === null) {
    return "N/A";
  }
  const minutes = Math.floor(numeric / 60);
  const seconds = Math.round(numeric % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDurationBucket(value: unknown): string {
  const text = asText(value);
  switch (text) {
    case "LT_25":
      return "Under 25m";
    case "25_TO_30":
      return "25-30m";
    case "30_TO_35":
      return "30-35m";
    case "GE_35":
      return "35m+";
    default:
      return text ?? "N/A";
  }
}

export function formatHourLabel(value: unknown): string {
  const text = asText(value);
  if (text === null) {
    return "N/A";
  }
  return `${text}:00`;
}
