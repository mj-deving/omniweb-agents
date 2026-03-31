export interface SubjectAlias {
  subject: string;
  aliases: string[];
  chain: string;
}

/**
 * Single source of truth for known crypto asset aliases.
 * Used by both claim-extractor (subject inference) and faithfulness-gate (subject binding).
 */
export const KNOWN_SUBJECT_ALIASES: readonly SubjectAlias[] = [
  { subject: "bitcoin", aliases: ["bitcoin", "btc"], chain: "btc:mainnet" },
  { subject: "ethereum", aliases: ["ethereum", "eth"], chain: "eth:1" },
  { subject: "solana", aliases: ["solana", "sol"], chain: "sol:mainnet" },
  { subject: "compound", aliases: ["compound", "compound finance"], chain: "eth:1" },
  { subject: "aave", aliases: ["aave"], chain: "eth:1" },
  { subject: "uniswap", aliases: ["uniswap", "uni"], chain: "eth:1" },
] as const;

/** Get all known aliases (lowercased) for a given subject. */
export function getAliasesForSubject(subject: string): string[] {
  const entry = KNOWN_SUBJECT_ALIASES.find(
    (a) => a.subject === subject.toLowerCase(),
  );
  return entry ? [...entry.aliases] : [subject.toLowerCase()];
}
