import type { MinimalAttestationCandidate } from "../minimal-attestation-plan.js";
import type { ResearchEvidenceSourceKind } from "./source-kind.js";

export function parseResearchEvidencePayload(
  source: MinimalAttestationCandidate,
  _sourceKind: ResearchEvidenceSourceKind,
  contentType: string,
  body: string,
): unknown {
  if (
    source.responseFormat === "csv"
    || contentType.includes("text/csv")
    || source.url.toLowerCase().endsWith(".csv")
  ) {
    return parseCsv(body);
  }

  return JSON.parse(body) as unknown;
}

function parseCsv(body: string): Array<Record<string, string>> {
  const lines = body.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [header, ...rows] = lines;
  if (!header) {
    return [];
  }

  const columns = header.split(",").map((value) => value.trim());
  return rows.map((row) => {
    const values = row.split(",").map((value) => value.trim());
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
  });
}
