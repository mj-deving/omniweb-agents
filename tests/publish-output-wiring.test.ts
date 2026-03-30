import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("publish CLI result wiring", () => {
  it("includes post text metadata in published JSON rows", () => {
    const source = readFileSync("cli/publish.ts", "utf-8");

    expect(source.includes("text?: string;")).toBe(true);
    expect(source.includes("textLength?: number;")).toBe(true);
    expect(source.includes("attestationType?:")).toBe(true);

    const publishLoop = source.slice(
      source.indexOf("for (const candidate of candidates)"),
      source.indexOf("const output: PublishOutput")
    );

    expect(publishLoop.includes("row.text = draft.text")).toBe(true);
    expect(
      publishLoop.includes("row.textLength = publish.textLength") ||
      publishLoop.includes("row.textLength = draft.text.length")
    ).toBe(true);
    expect(
      publishLoop.includes('row.attestationType = attested ? (attested.type === "tlsn" ? "TLSN" : "DAHR") : "none"')
    ).toBe(true);
  });
});
