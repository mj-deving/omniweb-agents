import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PACKAGE_ROOT } from "../_shared.js";

export function readPackageFile(relativePath: string): string {
  return normalizeText(readFileSync(resolve(PACKAGE_ROOT, relativePath), "utf8"));
}

export function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").trimEnd() + "\n";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
