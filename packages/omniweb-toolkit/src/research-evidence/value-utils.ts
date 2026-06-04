export function formatNestedMetric(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const peggedUsd = value.peggedUSD;
  return typeof peggedUsd === "number" && Number.isFinite(peggedUsd)
    ? String(Number(peggedUsd.toFixed(2)))
    : null;
}

export function normalizeScalarValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (isNumericString(trimmed)) return trimmed;
  }

  return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractSeries(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is [number, number] =>
      Array.isArray(entry)
      && entry.length >= 2
      && typeof entry[0] === "number"
      && typeof entry[1] === "number"
      && Number.isFinite(entry[0])
      && Number.isFinite(entry[1]))
    .map((entry) => [entry[0], entry[1]]);
}

export function maxValue(series: Array<[number, number]>): number | null {
  if (series.length === 0) return null;
  return Math.max(...series.map((entry) => entry[1]));
}

export function minValue(series: Array<[number, number]>): number | null {
  if (series.length === 0) return null;
  return Math.min(...series.map((entry) => entry[1]));
}

export function formatNumber(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const absolute = Math.abs(value);
  const decimals = absolute >= 1 ? 2 : absolute >= 0.01 ? 4 : 8;
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

export function parseNumber(value: string | undefined): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function scaleValue(value: string | undefined, factor: number): string | null {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  return String(Number((parsed * factor).toFixed(2)));
}

export function subtractValues(left: string | undefined, right: string | undefined): string | null {
  const a = parseNumber(left);
  const b = parseNumber(right);
  if (a == null || b == null) return null;
  return String(Number((a - b).toFixed(2)));
}

export function divideValues(left: string | undefined, right: string | undefined, precision: number): string | null {
  const numerator = parseNumber(left);
  const denominator = parseNumber(right);
  if (numerator == null || denominator == null || denominator === 0) {
    return null;
  }
  return String(Number((numerator / denominator).toFixed(precision)));
}

export function percentChange(currentValue: string | undefined, previousValue: string | undefined): string | null {
  const current = parseNumber(currentValue);
  const previous = parseNumber(previousValue);
  if (current == null || previous == null || previous === 0) {
    return null;
  }
  return String(Number((((current - previous) / previous) * 100).toFixed(2)));
}

export function basisPointSpread(left: string | undefined, right: string | undefined): string | null {
  const a = parseNumber(left);
  const b = parseNumber(right);
  if (a == null || b == null) {
    return null;
  }
  return String(Number(((a - b) * 100).toFixed(2)));
}

export function compactMetrics(metrics: Record<string, string | null>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metrics).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

export function deriveNetFlowDirection(value: string | undefined): string | null {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  if (parsed > 0) return "inflow";
  if (parsed < 0) return "outflow";
  return "flat";
}

function isNumericString(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value);
}
