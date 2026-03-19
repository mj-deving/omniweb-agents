/**
 * arXiv post-parse hook — ensures canonical URLs use HTTPS.
 *
 * arXiv's Atom XML feed returns HTTP URLs for abs/ links.
 * This hook normalizes them to HTTPS after the declarative
 * engine has extracted entries via regex patterns.
 */

import type { SourceRecordV2 } from "../../catalog.js";
import type { FetchedResponse, EvidenceEntry, ParsedAdapterResponse } from "../types.js";

export function postParse(
  _source: SourceRecordV2,
  _response: FetchedResponse,
  _parsedRoot: unknown,
  entries: EvidenceEntry[],
): ParsedAdapterResponse {
  for (const entry of entries) {
    if (entry.canonicalUrl?.startsWith("http://")) {
      entry.canonicalUrl = entry.canonicalUrl.replace("http://", "https://");
    }
  }
  return { entries };
}
