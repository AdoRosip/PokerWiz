import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildPhase1StatusReport } from "../tools/pack-builder/build-phase1-status";

const datasetPath = path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");

describe("phase1 status report", () => {
  it("reports phase 1 as complete for the current dev pack", async () => {
    const report = await buildPhase1StatusReport(datasetPath);

    expect(report.phase).toBe("Phase 1");
    expect(report.status).toBe("complete");
    expect(report.priority_families_present).toBe(report.priority_families_expected);
    expect(report.missing_priority_families).toHaveLength(0);
    expect(report.priority_families.length).toBeGreaterThan(0);
  });
});
