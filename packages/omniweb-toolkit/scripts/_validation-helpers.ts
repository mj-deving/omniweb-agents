import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type JsonObject = Record<string, unknown>;

export function getOptionalArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

export function getPositiveIntArg(argv: string[], flag: string, fallback: number): number {
  const raw = getOptionalArg(argv, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

export function getOptionalIntArg(argv: string[], flag: string): number | undefined {
  const raw = getOptionalArg(argv, flag);
  if (raw == null) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

export async function writeJsonOutput(path: string | undefined, report: unknown): Promise<void> {
  if (!path) return;
  const absolute = resolve(process.cwd(), path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function stripArgsWithValues(argv: string[], flags: string[]): string[] {
  const stripped: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === "--worker-mode") continue;
    if (flags.includes(token)) {
      index += 1;
      continue;
    }
    stripped.push(token);
  }
  return stripped;
}

export function compactProcessNotes(stdout: string, stderr: string): string[] {
  return [stdout.trim(), stderr.trim()].filter((entry) => entry.length > 0);
}

export function getArrayItem(value: unknown): unknown {
  return Array.isArray(value) && value.length > 0 ? value[0] : undefined;
}

export function getFirstRecordValue(value: JsonObject): unknown {
  const firstKey = Object.keys(value)[0];
  return firstKey ? value[firstKey] : undefined;
}

export function getNestedValue(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : undefined;
}

export function getNestedObject(value: unknown, key: string): JsonObject | undefined {
  const nested = getNestedValue(value, key);
  return isObject(nested) ? nested : undefined;
}

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

export function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

export function isNumberLike(value: unknown): value is number | string {
  if (isNumber(value)) {
    return true;
  }
  if (!isString(value)) {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && Number.isFinite(Number(trimmed));
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function describeJsonValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
