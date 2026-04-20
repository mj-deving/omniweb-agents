import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const DOCTRINE_DIR = fileURLToPath(
  new URL("../../packages/omniweb-toolkit/config/doctrine", import.meta.url),
);

const RESEARCH_FAMILIES = [
  "funding-structure",
  "etf-flows",
  "spot-momentum",
  "network-activity",
  "stablecoin-supply",
  "vix-credit",
];

describe("research metric semantics", () => {
  for (const family of RESEARCH_FAMILIES) {
    describe(family, () => {
      const raw = readFileSync(`${DOCTRINE_DIR}/${family}.yaml`, "utf8");
      const parsed = parseYaml(raw) as Record<string, unknown>;

      it("has a metrics section", () => {
        expect(parsed.metrics).toBeDefined();
        expect(typeof parsed.metrics).toBe("object");
        expect(Object.keys(parsed.metrics as object).length).toBeGreaterThan(0);
      });

      it("every metric has means and doesNotMean strings", () => {
        const metrics = parsed.metrics as Record<string, Record<string, unknown>>;
        for (const [key, entry] of Object.entries(metrics)) {
          expect(typeof entry.means, `${family}.metrics.${key}.means`).toBe("string");
          expect(
            (entry.means as string).length,
            `${family}.metrics.${key}.means non-empty`,
          ).toBeGreaterThan(0);
          expect(typeof entry.doesNotMean, `${family}.metrics.${key}.doesNotMean`).toBe(
            "string",
          );
          expect(
            (entry.doesNotMean as string).length,
            `${family}.metrics.${key}.doesNotMean non-empty`,
          ).toBeGreaterThan(0);
        }
      });
    });
  }
});
