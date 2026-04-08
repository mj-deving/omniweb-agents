import { describe, expect, it } from "vitest";

import { parseFredResponse } from "../../../src/toolkit/sources/fred-adapter.js";

describe("parseFredResponse", () => {
  it("parses the last valid FRED observation", () => {
    const responseBody = JSON.stringify({
      observations: [
        { date: "2024-10-01", value: "28765.123" },
        { date: "2025-01-01", value: "29123.456" },
      ],
    });

    expect(parseFredResponse(responseBody)).toEqual({
      value: 29123.456,
      date: "2025-01-01",
    });
  });

  it("skips missing observations marked with a dot", () => {
    const responseBody = JSON.stringify({
      observations: [
        { date: "2025-01-01", value: "4.1" },
        { date: "2025-02-01", value: "." },
      ],
    });

    expect(parseFredResponse(responseBody)).toEqual({
      value: 4.1,
      date: "2025-01-01",
    });
  });

  it("returns null for an empty observations array", () => {
    expect(parseFredResponse(JSON.stringify({ observations: [] }))).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseFredResponse("{")).toBeNull();
  });
});
