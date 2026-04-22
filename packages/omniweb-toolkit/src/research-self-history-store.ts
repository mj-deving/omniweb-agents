import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ResearchPublishHistoryEntry } from "./research-self-history.js";

const MAX_RESEARCH_PUBLISH_HISTORY = 25;

export function researchPublishHistoryPath(stateDir: string): string {
  return resolve(stateDir, "state", "research-publish-history.json");
}

export async function loadResearchPublishHistory(stateDir: string): Promise<ResearchPublishHistoryEntry[]> {
  const path = researchPublishHistoryPath(stateDir);
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isResearchPublishHistoryEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw error;
  }
}

export async function appendResearchPublishHistory(
  stateDir: string,
  entry: ResearchPublishHistoryEntry,
): Promise<ResearchPublishHistoryEntry[]> {
  const history = await loadResearchPublishHistory(stateDir);
  const next = [entry, ...history].slice(0, MAX_RESEARCH_PUBLISH_HISTORY);
  const path = researchPublishHistoryPath(stateDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function isResearchPublishHistoryEntry(value: unknown): value is ResearchPublishHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.topic !== "string") return false;
  if (candidate.family != null && typeof candidate.family !== "string") return false;
  if (typeof candidate.publishedAt !== "string") return false;
  if (typeof candidate.opportunityKind !== "string") return false;
  if (candidate.textSnippet != null && typeof candidate.textSnippet !== "string") return false;
  if (!candidate.evidenceValues || typeof candidate.evidenceValues !== "object" || Array.isArray(candidate.evidenceValues)) return false;
  return true;
}
