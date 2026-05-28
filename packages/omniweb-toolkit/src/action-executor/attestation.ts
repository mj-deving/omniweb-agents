import type { ResolvedIntent } from "../intent-types.js";
import type { MinimalAttestationPlan } from "../minimal-attestation-plan.js";

export function validateResolvedIntentAttestation(
  resolution: ResolvedIntent,
  plan?: MinimalAttestationPlan,
): string | null {
  if (plan && !plan.ready) {
    return `attestation_plan_not_ready:${plan.reason}`;
  }

  if (resolution.actionType !== "publish" && resolution.actionType !== "reply") {
    return null;
  }

  const attestUrl = resolution.normalizedDraft.attestUrl;
  if (typeof attestUrl !== "string" || attestUrl.length === 0) {
    return `missing_attest_url:${resolution.actionType}`;
  }

  if (isPlaceholderAttestUrl(attestUrl)) {
    return `placeholder_attest_url:${attestUrl}`;
  }

  const plannedUrl = plan?.primary?.url;
  if (plannedUrl && plannedUrl !== attestUrl) {
    return `attest_url_mismatch:${attestUrl}`;
  }

  return null;
}

export function isPlaceholderAttestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "example.com"
      || parsed.hostname === "www.example.com"
      || parsed.pathname.includes("example")
      || parsed.pathname.includes("placeholder");
  } catch {
    return true;
  }
}
