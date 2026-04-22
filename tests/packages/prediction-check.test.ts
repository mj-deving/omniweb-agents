import { describe, expect, it } from "vitest";

import {
  comparePredictionObservedValue,
  extractJsonPathValue,
  parsePredictionCheckValueType,
  parsePredictionExpectedValue,
  resolvePredictionCheck,
  type PredictionCheckSpec,
} from "../../packages/omniweb-toolkit/scripts/_prediction-check";

describe("prediction check helper", () => {
  it("extracts nested values from dot and array paths", () => {
    const payload = {
      prices: [
        { symbol: "BTC", value: 71234.5 },
      ],
      flags: {
        negative: true,
      },
    };

    expect(extractJsonPathValue(payload, "prices[0].value")).toBe(71234.5);
    expect(extractJsonPathValue(payload, "$.flags.negative")).toBe(true);
  });

  it("parses expected values by declared type", () => {
    expect(parsePredictionExpectedValue("71.5", "number")).toBe(71.5);
    expect(parsePredictionExpectedValue("true", "boolean")).toBe(true);
    expect(parsePredictionExpectedValue("bearish", "string")).toBe("bearish");
  });

  it("rejects unsupported prediction value types", () => {
    expect(parsePredictionCheckValueType(undefined)).toBe("number");
    expect(parsePredictionCheckValueType("string")).toBe("string");
    expect(() => parsePredictionCheckValueType("num")).toThrow(
      "Invalid --verify-value-type value: num",
    );
  });

  it("compares observed values using numeric, boolean, and contains operators", () => {
    expect(comparePredictionObservedValue("71.4", {
      operator: "lt",
      expected: 72,
      expectedType: "number",
    })).toBe(true);

    expect(comparePredictionObservedValue(false, {
      operator: "eq",
      expected: false,
      expectedType: "boolean",
    })).toBe(true);

    expect(comparePredictionObservedValue("BTC funding stays negative", {
      operator: "contains",
      expected: "negative",
      expectedType: "string",
    })).toBe(true);
  });

  it("resolves a prediction check against fetched JSON and reports pass/fail", async () => {
    const spec: PredictionCheckSpec = {
      version: 1,
      sourceUrl: "https://example.com/data.json",
      sourceName: "Example Data",
      jsonPath: "prices.btc",
      operator: "gte",
      expected: 70000,
      expectedType: "number",
      observedLabel: "BTC price",
      deadlineAt: "2026-04-22T12:00:00.000Z",
      confidence: 68,
      falsifier: "BTC trades back below 70k at the deadline.",
    };

    const result = await resolvePredictionCheck(spec, async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({
        prices: {
          btc: 71250,
        },
      }),
    }));

    expect(result.ok).toBe(true);
    expect(result.observedValue).toBe(71250);
    expect(result.comparisonPassed).toBe(true);
  });
});
