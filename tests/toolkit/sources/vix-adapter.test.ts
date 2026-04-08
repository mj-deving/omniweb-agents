import { describe, expect, it } from "vitest";

import { parseVixCsv } from "../../../src/toolkit/sources/vix-adapter.js";

describe("parseVixCsv", () => {
  it("parses the last row from a valid CSV with multiple data rows", () => {
    const responseBody = [
      "DATE,OPEN,HIGH,LOW,CLOSE",
      "2025-04-01,21.1,22.0,20.8,21.51",
      "2025-04-02,22.4,23.2,21.7,22.96",
    ].join("\n");

    expect(parseVixCsv(responseBody)).toEqual({
      close: 22.96,
      date: "2025-04-02",
    });
  });

  it("parses a CSV with a single data row", () => {
    const responseBody = [
      "DATE,OPEN,HIGH,LOW,CLOSE",
      "2025-04-03,24.0,24.4,23.1,23.76",
    ].join("\n");

    expect(parseVixCsv(responseBody)).toEqual({
      close: 23.76,
      date: "2025-04-03",
    });
  });

  it("returns null for an empty body", () => {
    expect(parseVixCsv("")).toBeNull();
  });

  it("returns null when the CSV only contains a header row", () => {
    expect(parseVixCsv("DATE,OPEN,HIGH,LOW,CLOSE\n")).toBeNull();
  });

  it("returns null for a malformed CLOSE value", () => {
    const responseBody = [
      "DATE,OPEN,HIGH,LOW,CLOSE",
      "2025-04-04,24.0,24.9,23.8,not-a-number",
    ].join("\n");

    expect(parseVixCsv(responseBody)).toBeNull();
  });
});
