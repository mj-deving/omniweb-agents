import type { PublishVisibilityResult } from "../publish-visibility.js";

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function readApiErrorMessage(value: unknown): string | null {
  if (typeof value === "string") return value.trim().length > 0 ? value : null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" ? record.message : null;
}

export function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isVerificationResult(value: unknown): value is PublishVisibilityResult {
  return Boolean(value && typeof value === "object" && "visible" in value && "indexedVisible" in value);
}
