export type PredictionCheckOperator =
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "eq"
  | "neq"
  | "contains";

export type PredictionCheckValueType = "number" | "string" | "boolean";
export const PREDICTION_CHECK_VALUE_TYPES: readonly PredictionCheckValueType[] = ["number", "string", "boolean"];

export interface PredictionCheckSpec {
  version: 1;
  sourceUrl: string;
  sourceName: string | null;
  jsonPath: string;
  operator: PredictionCheckOperator;
  expected: string | number | boolean;
  expectedType: PredictionCheckValueType;
  observedLabel: string | null;
  deadlineAt: string;
  confidence: number;
  falsifier: string;
}

export interface PredictionCheckResult {
  ok: boolean;
  sourceUrl: string;
  sourceName: string | null;
  jsonPath: string;
  operator: PredictionCheckOperator;
  expected: string | number | boolean;
  expectedType: PredictionCheckValueType;
  observedLabel: string | null;
  observedValue: unknown;
  fetchedAt: string;
  comparisonPassed: boolean;
  error?: string;
}

interface FetchJsonResult {
  ok: boolean;
  status: number;
  body: string;
  error?: string;
}

export function isPredictionCheckSpec(value: unknown): value is PredictionCheckSpec {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PredictionCheckSpec>;
  return (
    candidate.version === 1 &&
    typeof candidate.sourceUrl === "string" &&
    typeof candidate.jsonPath === "string" &&
    typeof candidate.operator === "string" &&
    typeof candidate.expectedType === "string" &&
    typeof candidate.deadlineAt === "string" &&
    typeof candidate.confidence === "number" &&
    typeof candidate.falsifier === "string"
  );
}

export function parsePredictionExpectedValue(
  raw: string,
  expectedType: PredictionCheckValueType,
): string | number | boolean {
  if (expectedType === "number") {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Expected numeric --verify-value, received: ${raw}`);
    }
    return parsed;
  }

  if (expectedType === "boolean") {
    if (raw === "true") return true;
    if (raw === "false") return false;
    throw new Error(`Expected boolean --verify-value (true|false), received: ${raw}`);
  }

  return raw;
}

export function parsePredictionCheckValueType(
  raw: string | null | undefined,
): PredictionCheckValueType {
  const normalized = (raw ?? "number").trim();
  if (normalized === "number" || normalized === "string" || normalized === "boolean") {
    return normalized;
  }
  throw new Error(
    `Invalid --verify-value-type value: ${raw}. Expected one of: ${PREDICTION_CHECK_VALUE_TYPES.join("|")}`,
  );
}

export function extractJsonPathValue(input: unknown, jsonPath: string): unknown {
  const path = jsonPath.trim();
  if (!path) return input;
  const tokens = tokenizeJsonPath(path);
  let cursor: unknown = input;

  for (const token of tokens) {
    if (typeof token === "number") {
      if (!Array.isArray(cursor)) return undefined;
      cursor = cursor[token];
      continue;
    }

    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[token];
  }

  return cursor;
}

export function comparePredictionObservedValue(
  observedValue: unknown,
  spec: Pick<PredictionCheckSpec, "operator" | "expected" | "expectedType">,
): boolean {
  if (spec.operator === "contains") {
    const haystack = stringifyObservedValue(observedValue);
    return haystack.includes(String(spec.expected));
  }

  if (spec.expectedType === "number") {
    const observedNumber = toNumber(observedValue);
    const expectedNumber = typeof spec.expected === "number" ? spec.expected : Number(spec.expected);
    if (!Number.isFinite(observedNumber) || !Number.isFinite(expectedNumber)) return false;
    switch (spec.operator) {
      case "lt":
        return observedNumber < expectedNumber;
      case "lte":
        return observedNumber <= expectedNumber;
      case "gt":
        return observedNumber > expectedNumber;
      case "gte":
        return observedNumber >= expectedNumber;
      case "eq":
        return observedNumber === expectedNumber;
      case "neq":
        return observedNumber !== expectedNumber;
      default:
        return false;
    }
  }

  if (spec.expectedType === "boolean") {
    const observedBool = toBoolean(observedValue);
    const expectedBool = typeof spec.expected === "boolean" ? spec.expected : spec.expected === "true";
    if (observedBool == null) return false;
    switch (spec.operator) {
      case "eq":
        return observedBool === expectedBool;
      case "neq":
        return observedBool !== expectedBool;
      default:
        return false;
    }
  }

  const observedString = stringifyObservedValue(observedValue);
  const expectedString = String(spec.expected);
  switch (spec.operator) {
    case "eq":
      return observedString === expectedString;
    case "neq":
      return observedString !== expectedString;
    case "lt":
      return observedString < expectedString;
    case "lte":
      return observedString <= expectedString;
    case "gt":
      return observedString > expectedString;
    case "gte":
      return observedString >= expectedString;
    default:
      return false;
  }
}

export async function resolvePredictionCheck(
  spec: PredictionCheckSpec,
  fetchJson: (url: string) => Promise<FetchJsonResult> = fetchJsonUrl,
): Promise<PredictionCheckResult> {
  const fetchedAt = new Date().toISOString();
  const response = await fetchJson(spec.sourceUrl);
  if (!response.ok) {
    return {
      ok: false,
      sourceUrl: spec.sourceUrl,
      sourceName: spec.sourceName,
      jsonPath: spec.jsonPath,
      operator: spec.operator,
      expected: spec.expected,
      expectedType: spec.expectedType,
      observedLabel: spec.observedLabel,
      observedValue: null,
      fetchedAt,
      comparisonPassed: false,
      error: response.error ?? `fetch failed with status ${response.status}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch (error) {
    return {
      ok: false,
      sourceUrl: spec.sourceUrl,
      sourceName: spec.sourceName,
      jsonPath: spec.jsonPath,
      operator: spec.operator,
      expected: spec.expected,
      expectedType: spec.expectedType,
      observedLabel: spec.observedLabel,
      observedValue: null,
      fetchedAt,
      comparisonPassed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const observedValue = extractJsonPathValue(parsed, spec.jsonPath);
  const comparisonPassed = comparePredictionObservedValue(observedValue, spec);

  return {
    ok: true,
    sourceUrl: spec.sourceUrl,
    sourceName: spec.sourceName,
    jsonPath: spec.jsonPath,
    operator: spec.operator,
    expected: spec.expected,
    expectedType: spec.expectedType,
    observedLabel: spec.observedLabel,
    observedValue,
    fetchedAt,
    comparisonPassed,
  };
}

async function fetchJsonUrl(url: string): Promise<FetchJsonResult> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function tokenizeJsonPath(path: string): Array<string | number> {
  const normalized = path.startsWith("$.") ? path.slice(2) : path.startsWith("$") ? path.slice(1) : path;
  if (!normalized) return [];

  return normalized.split(".").flatMap((segment) => {
    const tokens: Array<string | number> = [];
    const matcher = /([^[\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(segment)) !== null) {
      if (match[1]) {
        tokens.push(match[1]);
      } else if (match[2]) {
        tokens.push(Number(match[2]));
      }
    }
    return tokens;
  });
}

function stringifyObservedValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
