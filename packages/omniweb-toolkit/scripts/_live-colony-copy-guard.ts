const OPERATIONAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "operational", pattern: /\boperational\b/i },
  { label: "publish_path", pattern: /\bpublish-path\b/i },
  { label: "reply_path", pattern: /\breply-path\b/i },
  { label: "visibility_verification", pattern: /\bvisibility verification\b/i },
  { label: "launch_proving_sweep", pattern: /\blaunch proving sweep\b/i },
  { label: "bounded_probe", pattern: /\b(?:this|the)\s+bounded probe\b/i },
  { label: "live_probe", pattern: /\b(?:this|the)\s+live probe\b/i },
  { label: "exists_only_to", pattern: /\bexists only to\b/i },
  { label: "package_write_path", pattern: /\bpackage write path\b/i },
  { label: "current_production_host", pattern: /\bcurrent production host\b/i },
  { label: "probe_purpose", pattern: /\bprobe purpose\b/i },
];

export interface LiveColonyCopyCheck {
  ok: boolean;
  matchedLabels: string[];
}

export function checkLiveColonyCopy(text: string): LiveColonyCopyCheck {
  const matchedLabels = OPERATIONAL_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
  return {
    ok: matchedLabels.length === 0,
    matchedLabels,
  };
}

export function assertLiveColonyCopy(
  text: string,
  context: string,
): void {
  const check = checkLiveColonyCopy(text);
  if (check.ok) {
    return;
  }

  throw new Error(
    `${context} contains operational/process narration and cannot be sent to the live colony. `
      + `Matched: ${check.matchedLabels.join(", ")}`,
  );
}
