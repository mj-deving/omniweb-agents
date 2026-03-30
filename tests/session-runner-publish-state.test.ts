import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("session-runner publish state wiring", () => {
  it("stores publish post metadata in state.posts for transcript extraction", () => {
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    const manualSection = source.slice(
      source.indexOf("async function runPublishManual"),
      source.indexOf("async function runPublishAutonomous")
    );
    const autonomousSection = source.slice(
      source.indexOf("async function runPublishAutonomous"),
      source.indexOf("// ── VERIFY Phase")
    );

    expect(manualSection.includes("state.posts.push({")).toBe(true);
    expect(manualSection.includes("txHash,")).toBe(true);
    expect(manualSection.includes('text: gp.text || ""')).toBe(true);
    expect(manualSection.includes('textLength: (gp.text || "").length')).toBe(true);
    expect(manualSection.includes('attestationType: "unknown"')).toBe(true);

    expect(autonomousSection.includes("state.posts.push({")).toBe(true);
    expect(autonomousSection.includes("txHash: pubResult.txHash")).toBe(true);
    expect(autonomousSection.includes("category: draft.category")).toBe(true);
    expect(autonomousSection.includes("text: draft.text")).toBe(true);
    expect(autonomousSection.includes("textLength: pubResult.textLength")).toBe(true);
    expect(autonomousSection.includes("attestationType: selectedMethod")).toBe(true);
    expect(autonomousSection.includes("topic: gp.topic")).toBe(true);
  });

  it("maps stored post entries back to tx hashes for verify and reporting flows", () => {
    const source = readFileSync("cli/session-runner.ts", "utf-8");

    expect(source.includes("function getPostTxHash(")).toBe(true);
    expect(
      source.includes('const args = [...state.posts.map(getPostTxHash), "--json", "--log", flags.log, "--env", flags.env];')
    ).toBe(true);
    expect(source.includes("for (const post of state.posts) {")).toBe(true);
    expect(source.includes("const tx = getPostTxHash(post);")).toBe(true);
  });
});
