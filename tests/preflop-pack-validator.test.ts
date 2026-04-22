import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadStrategyPack, validateStrategyPack } from "../tools/pack-validate/validate-preflop-pack";

const datasetPath = path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");

describe("preflop pack validator", () => {
  it("accepts the current dev pack with no validation errors", async () => {
    const pack = await loadStrategyPack(datasetPath);
    const summary = validateStrategyPack(pack);
    expect(summary.entry_count).toBeGreaterThan(0);
    expect(summary.scenario_count).toBeGreaterThan(0);
    expect(summary.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  });
});
