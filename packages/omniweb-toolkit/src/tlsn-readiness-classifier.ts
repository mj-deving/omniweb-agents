export type TLSNReadinessVerdict = "GREEN" | "DEGRADED" | "BLOCKED" | "EXCLUDED";

export interface TLSNBudgetEvidence {
  concreteQuote: boolean;
  quotedFeeDem: number | null;
  estimatedWorstCaseDem: number | null;
  hardBudgetDem: number | null;
  withinBudget: boolean | null;
}

export interface TLSNReadinessClassification {
  ok: boolean;
  verdict: TLSNReadinessVerdict;
  includeInSuccessorPacket: boolean;
  budget: TLSNBudgetEvidence;
  reasonCodes: string[];
}

export function classifyTLSNReadiness(input: {
  targetUrlValid: boolean;
  requiredDependenciesReady: boolean;
  optionalDependencyWarnings?: string[];
  concreteQuote: boolean;
  quotedFeeDem?: number | null;
  estimatedWorstCaseDem?: number | null;
  hardBudgetDem?: number | null;
  sanitizedProofMaterialPath?: string | null;
  proofMaterialSanitizerProven: boolean;
}): TLSNReadinessClassification {
  const reasonCodes = new Set<string>();
  const hardBudgetDem = finiteOrNull(input.hardBudgetDem);
  const quotedFeeDem = finiteOrNull(input.quotedFeeDem);
  const estimatedWorstCaseDem = finiteOrNull(input.estimatedWorstCaseDem);
  const comparableFeeDem = quotedFeeDem ?? estimatedWorstCaseDem;
  const withinBudget = hardBudgetDem === null || comparableFeeDem === null
    ? null
    : comparableFeeDem <= hardBudgetDem;

  if (!input.targetUrlValid) reasonCodes.add("tlsn_target_url_invalid");
  if (!input.requiredDependenciesReady) reasonCodes.add("tlsn_required_dependency_unavailable");
  if (!input.concreteQuote) reasonCodes.add("tlsn_concrete_quote_missing");
  if (hardBudgetDem === null) reasonCodes.add("tlsn_explicit_budget_missing");
  if (withinBudget === false) reasonCodes.add("tlsn_quote_exceeds_budget");
  if (!input.sanitizedProofMaterialPath) reasonCodes.add("tlsn_sanitized_proof_material_path_missing");
  if (!input.proofMaterialSanitizerProven) reasonCodes.add("tlsn_proof_material_sanitizer_unproven");
  for (const warning of input.optionalDependencyWarnings ?? []) {
    reasonCodes.add(warning);
  }

  const budget = {
    concreteQuote: input.concreteQuote,
    quotedFeeDem,
    estimatedWorstCaseDem,
    hardBudgetDem,
    withinBudget,
  };

  const missingInclusionPrerequisite =
    !input.concreteQuote
    || !input.sanitizedProofMaterialPath
    || !input.proofMaterialSanitizerProven;

  if (missingInclusionPrerequisite) {
    return {
      ok: false,
      verdict: "EXCLUDED",
      includeInSuccessorPacket: false,
      budget,
      reasonCodes: [...reasonCodes],
    };
  }

  const blocked =
    !input.targetUrlValid
    || !input.requiredDependenciesReady
    || hardBudgetDem === null
    || withinBudget !== true;

  if (blocked) {
    return {
      ok: false,
      verdict: "BLOCKED",
      includeInSuccessorPacket: false,
      budget,
      reasonCodes: [...reasonCodes],
    };
  }

  const optionalWarnings = input.optionalDependencyWarnings?.length ?? 0;
  return {
    ok: optionalWarnings === 0,
    verdict: optionalWarnings === 0 ? "GREEN" : "DEGRADED",
    includeInSuccessorPacket: true,
    budget,
    reasonCodes: [...reasonCodes],
  };
}

function finiteOrNull(value: number | null | undefined): number | null {
  return Number.isFinite(value ?? NaN) ? Number(value) : null;
}
