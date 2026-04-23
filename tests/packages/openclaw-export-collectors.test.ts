import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectTextFiles as collectOpenClawFiles,
  normalizeExportRelativePath,
  normalizePathSeparators,
} from "../../packages/omniweb-toolkit/scripts/_openclaw-export.ts";
import { collectTextFiles as collectRegistryFiles } from "../../packages/omniweb-toolkit/scripts/_registry-export.ts";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("OpenClaw export collectors", () => {
  it("skip installed dependency trees and symlinked directories", () => {
    const root = mkdtempSync(join(tmpdir(), "openclaw-export-collector-"));
    const linkedSource = mkdtempSync(join(tmpdir(), "openclaw-export-linked-"));
    tempDirs.push(root, linkedSource);

    mkdirSync(join(root, "skills", "demo"), { recursive: true });
    writeFileSync(join(root, "skills", "demo", "SKILL.md"), "# demo\n", "utf8");

    mkdirSync(join(root, "node_modules", "demo-package"), { recursive: true });
    writeFileSync(join(root, "node_modules", "demo-package", "index.js"), "export {};\n", "utf8");

    mkdirSync(join(linkedSource, "nested"), { recursive: true });
    writeFileSync(join(linkedSource, "nested", "README.md"), "# linked\n", "utf8");
    symlinkSync(linkedSource, join(root, "linked-skill"), "dir");

    const openclawPaths = collectOpenClawFiles(root).map((file) => file.path);
    const registryPaths = collectRegistryFiles(root).map((file) => file.path);

    expect(openclawPaths).toEqual(["skills/demo/SKILL.md"]);
    expect(registryPaths).toEqual(["skills/demo/SKILL.md"]);
  });

  it("normalizes Windows separators to POSIX separators", () => {
    expect(normalizePathSeparators("skills\\demo\\nested\\SKILL.md")).toBe("skills/demo/nested/SKILL.md");
  });

  it("preserves normalized relative paths", () => {
    expect(normalizeExportRelativePath("skills", join("skills", "demo", "nested", "SKILL.md"))).toBe("demo/nested/SKILL.md");
  });
});
