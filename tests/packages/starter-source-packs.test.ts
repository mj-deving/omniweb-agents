import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../../src/toolkit/sources/catalog.js";
import {
  getStarterSourcePack,
  listStarterSourcePacks,
} from "../../packages/omniweb-toolkit/src/starter-source-packs.js";

const CATALOG_PATH = fileURLToPath(
  new URL("../../config/sources/catalog.json", import.meta.url),
);

describe("starter source packs", () => {
  it("returns the three archetype packs", () => {
    const packs = listStarterSourcePacks();
    expect(packs.map((pack) => pack.archetype)).toEqual([
      "research",
      "market",
      "engagement",
    ]);
  });

  it("only references active DAHR-safe sources in the catalog", () => {
    const catalog = loadCatalog(CATALOG_PATH);
    expect(catalog).not.toBeNull();

    const byId = new Map(catalog!.sources.map((source) => [source.id, source]));

    for (const pack of listStarterSourcePacks()) {
      expect(pack.entries.length).toBeGreaterThan(0);
      for (const entry of pack.entries) {
        const source = byId.get(entry.sourceId);
        expect(source, `${pack.archetype}:${entry.sourceId}`).toBeDefined();
        expect(source?.status, `${pack.archetype}:${entry.sourceId} active`).toBe("active");
        expect(source?.dahr_safe, `${pack.archetype}:${entry.sourceId} dahr_safe`).toBe(true);
      }
    }
  });

  it("returns defensive copies", () => {
    const pack = getStarterSourcePack("market");
    pack.entries.pop();
    expect(getStarterSourcePack("market").entries).toHaveLength(6);
  });
});
