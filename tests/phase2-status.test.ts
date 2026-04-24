import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildPhase2StatusReport } from "../tools/pack-builder/build-phase2-status";

describe("phase 2 status report", () => {
  it("marks phase 2 complete when workflow docs, adapters, and validation features are present", async () => {
    const report = await buildPhase2StatusReport(path.resolve(process.cwd()));

    expect(report.phase).toBe("Phase 2");
    expect(report.status).toBe("complete");
    expect(report.named_adapters).toContain("simple_csv_profile_v1");
    expect(report.generic_adapters).toEqual(
      expect.arrayContaining(["flat_preflop_export_v1", "tabular_preflop_export_v1"]),
    );
    expect(report.workflow_docs_present).toBe(true);
    expect(report.commands).toEqual(
      expect.arrayContaining(["import:solver", "build:manifest", "build:phase2-status"]),
    );
    expect(report.validation_features.every((feature) => feature.status === "complete")).toBe(true);
  });
});
