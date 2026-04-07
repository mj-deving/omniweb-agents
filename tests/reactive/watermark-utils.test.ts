import { describe, expect, it } from "vitest";

import { extractLatestWatermark } from "../../src/reactive/event-sources/watermark-utils.js";

describe("extractLatestWatermark", () => {
  it("returns the watermark for the item with the greatest timestamp", () => {
    const items = [
      { id: "a", timestamp: 100 },
      { id: "b", timestamp: 300 },
      { id: "c", timestamp: 200 },
    ];

    expect(extractLatestWatermark(items, item => ({ id: item.id, at: item.timestamp }))).toEqual({
      id: "b",
      at: 300,
    });
  });

  it("returns null for empty input and prefers the last item on equal timestamps", () => {
    expect(extractLatestWatermark([], item => item)).toBeNull();
    expect(
      extractLatestWatermark(
        [
          { id: "a", timestamp: 100 },
          { id: "b", timestamp: 100 },
        ],
        item => item.id,
      ),
    ).toBe("b");
  });

  it("propagates mapper failures", () => {
    expect(() =>
      extractLatestWatermark([{ timestamp: 1 }], () => {
        throw new Error("map failed");
      }),
    ).toThrow("map failed");
  });
});
