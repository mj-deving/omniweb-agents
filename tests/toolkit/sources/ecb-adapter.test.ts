import { describe, expect, it } from "vitest";

import { parseEcbJsonData } from "../../../src/toolkit/sources/ecb-adapter.js";

describe("parseEcbJsonData", () => {
  it("parses the last ECB observation and resolves its period", () => {
    const responseBody = JSON.stringify({
      dataSets: [
        {
          series: {
            "0:0:0:0:0": {
              observations: {
                "0": [1.0812],
                "1": [1.0845],
              },
            },
          },
        },
      ],
      structure: {
        dimensions: {
          observation: [
            {
              values: [
                { id: "2025-01-01" },
                { id: "2025-01-02" },
              ],
            },
          ],
        },
      },
    });

    expect(parseEcbJsonData(responseBody)).toEqual({
      value: 1.0845,
      period: "2025-01-02",
    });
  });

  it("returns null when dataSets is empty", () => {
    expect(parseEcbJsonData(JSON.stringify({ dataSets: [] }))).toBeNull();
  });

  it("returns null when the first data set is missing series", () => {
    expect(parseEcbJsonData(JSON.stringify({ dataSets: [{}] }))).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseEcbJsonData("{")).toBeNull();
  });
});
