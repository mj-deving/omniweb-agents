export function decideIndexingLagOutcome(opts: {
  entryAgeMs: number;
  maxIndexingLagMs: number;
  deferLagMs: number;
}): { kind: "defer"; deferByMs: number } | { kind: "terminal"; indexingLagMs: number | null } {
  if (!Number.isFinite(opts.entryAgeMs) || opts.entryAgeMs < opts.maxIndexingLagMs) {
    return {
      kind: "defer",
      deferByMs: opts.deferLagMs,
    };
  }

  return {
    kind: "terminal",
    indexingLagMs: opts.entryAgeMs,
  };
}
