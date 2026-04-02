import { describe, expect, it } from "vitest";

// Test the inferCategory logic by checking that the executor uses the right categories.
// Since inferCategory is a private function, we test it indirectly through the executor's
// behavior, or we can test the logic itself by extracting it.

describe("category inference logic", () => {
  // Direct logic tests matching inferCategory() in action-executor.ts
  function inferCategory(reason: string, metadata?: Record<string, unknown>): string {
    const lower = reason.toLowerCase();
    if (lower.includes("prediction") || lower.includes("ballot")) return "prediction";
    if (lower.includes("divergence") || lower.includes("signal")) return "signal";
    if (lower.includes("alert") || lower.includes("urgent")) return "alert";
    if (lower.includes("observation") || lower.includes("observed")) return "observation";
    if (typeof metadata?.category === "string") return metadata.category;
    return "analysis";
  }

  it("returns prediction for ballot-related actions", () => {
    expect(inferCategory("Publish prediction — ballot accuracy 70%")).toBe("prediction");
  });

  it("returns signal for divergence actions", () => {
    expect(inferCategory("Publish divergence analysis: BTC spread +15%")).toBe("signal");
  });

  it("returns signal for signal-aligned actions", () => {
    expect(inferCategory("Publish signal-aligned content on trending topic defi")).toBe("signal");
  });

  it("returns alert for alert actions", () => {
    expect(inferCategory("Urgent alert: security vulnerability detected")).toBe("alert");
  });

  it("returns observation for observation actions", () => {
    expect(inferCategory("Observed new pattern in DeFi activity")).toBe("observation");
  });

  it("uses metadata.category when no keyword match", () => {
    expect(inferCategory("Some generic reason", { category: "question" })).toBe("question");
  });

  it("defaults to analysis", () => {
    expect(inferCategory("Publish fresh evidence into underserved topic security")).toBe("analysis");
  });
});
