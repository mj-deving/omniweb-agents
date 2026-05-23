import { describe, expect, it } from "vitest";

import { classifyTLSNReadiness } from "../../packages/omniweb-toolkit/src/tlsn-readiness-classifier.js";

describe("TLSN readiness classifier", () => {
  it("excludes TLSN when the quote is only an estimate and proof material cannot be sanitized", () => {
    const readiness = classifyTLSNReadiness({
      targetUrlValid: true,
      requiredDependenciesReady: true,
      optionalDependencyWarnings: ["tlsn_sdk_tlsnotary_subpath_unreliable"],
      concreteQuote: false,
      estimatedWorstCaseDem: 35,
      hardBudgetDem: 5,
      sanitizedProofMaterialPath: null,
      proofMaterialSanitizerProven: false,
    });

    expect(readiness).toMatchObject({
      ok: false,
      verdict: "EXCLUDED",
      includeInSuccessorPacket: false,
      budget: {
        concreteQuote: false,
        estimatedWorstCaseDem: 35,
        hardBudgetDem: 5,
        withinBudget: false,
      },
    });
    expect(readiness.reasonCodes).toEqual(expect.arrayContaining([
      "tlsn_concrete_quote_missing",
      "tlsn_quote_exceeds_budget",
      "tlsn_sanitized_proof_material_path_missing",
      "tlsn_proof_material_sanitizer_unproven",
    ]));
  });

  it("blocks concrete quotes that exceed the explicit budget", () => {
    const readiness = classifyTLSNReadiness({
      targetUrlValid: true,
      requiredDependenciesReady: true,
      concreteQuote: true,
      quotedFeeDem: 7,
      hardBudgetDem: 5,
      sanitizedProofMaterialPath: "packages/omniweb-toolkit/references/tlsn/proof-redaction.md",
      proofMaterialSanitizerProven: true,
    });

    expect(readiness.verdict).toBe("BLOCKED");
    expect(readiness.includeInSuccessorPacket).toBe(false);
    expect(readiness.reasonCodes).toContain("tlsn_quote_exceeds_budget");
  });

  it("returns GREEN when quote, budget, dependencies, and sanitized proof material are ready", () => {
    const readiness = classifyTLSNReadiness({
      targetUrlValid: true,
      requiredDependenciesReady: true,
      concreteQuote: true,
      quotedFeeDem: 3,
      hardBudgetDem: 5,
      sanitizedProofMaterialPath: "packages/omniweb-toolkit/references/tlsn/proof-redaction.md",
      proofMaterialSanitizerProven: true,
    });

    expect(readiness).toMatchObject({
      ok: true,
      verdict: "GREEN",
      includeInSuccessorPacket: true,
      reasonCodes: [],
    });
  });

  it("returns DEGRADED when only optional dependency warnings remain", () => {
    const readiness = classifyTLSNReadiness({
      targetUrlValid: true,
      requiredDependenciesReady: true,
      optionalDependencyWarnings: ["tlsn_sdk_tlsnotary_subpath_unreliable"],
      concreteQuote: true,
      quotedFeeDem: 3,
      hardBudgetDem: 5,
      sanitizedProofMaterialPath: "packages/omniweb-toolkit/references/tlsn/proof-redaction.md",
      proofMaterialSanitizerProven: true,
    });

    expect(readiness.ok).toBe(false);
    expect(readiness.verdict).toBe("DEGRADED");
    expect(readiness.includeInSuccessorPacket).toBe(true);
    expect(readiness.reasonCodes).toContain("tlsn_sdk_tlsnotary_subpath_unreliable");
  });
});
