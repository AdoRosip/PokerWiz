import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildPreflopManifest } from "../tools/pack-builder/build-preflop-manifest";

const datasetPath = path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");

describe("preflop pack manifest", () => {
  it("builds deterministic manifest metadata from the dev pack", async () => {
    const manifest = await buildPreflopManifest(datasetPath);
    expect(manifest.schema_version).toBe(1);
    expect(manifest.manifest_version).toBe(1);
    expect(manifest.dataset_version).toBe("solver_dataset_v1_dev");
    expect(manifest.entry_count).toBeGreaterThan(0);
    expect(manifest.scenario_count).toBeGreaterThan(0);
    expect(manifest.hero_position_scenario_counts.BTN).toBeGreaterThan(0);
    expect(manifest.line_signature_scenario_counts.facing_open).toBeGreaterThan(0);
    expect(manifest.scenarios[0].matched_scenario_key).toBeTruthy();
  });
});
