import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PreflopStrategyRepository } from "../../packages/pack-repository/preflop-strategy-repository";
import { ORDERED_POSITIONS, type PreflopPackManifest, type ScenarioDescriptor } from "../../shared/contracts";
import { loadStrategyPack } from "../pack-validate/validate-preflop-pack";

const LINE_SIGNATURES: ScenarioDescriptor["line_signature"][] = [
  "first_in",
  "facing_open",
  "facing_open_plus_call",
  "facing_open_and_3bet",
  "facing_open_3bet_4bet",
];

export async function buildPreflopManifest(packPath: string): Promise<PreflopPackManifest> {
  const pack = await loadStrategyPack(packPath);
  const repository = new PreflopStrategyRepository(pack);
  const summary = repository.summary();

  const heroPositionScenarioCounts = Object.fromEntries(
    ORDERED_POSITIONS.map((position) => [
      position,
      summary.scenarios.filter((scenario) => scenario.hero_position === position).length,
    ]),
  ) as Record<(typeof ORDERED_POSITIONS)[number], number>;

  const lineSignatureScenarioCounts = Object.fromEntries(
    LINE_SIGNATURES.map((lineSignature) => [
      lineSignature,
      summary.scenarios.filter((scenario) => scenario.line_signature === lineSignature).length,
    ]),
  ) as Record<ScenarioDescriptor["line_signature"], number>;

  return {
    schema_version: 1,
    manifest_version: 1,
    dataset_version: summary.dataset_version,
    game: summary.game,
    source_pack: path.basename(packPath),
    entry_count: summary.total_entries,
    scenario_count: summary.total_scenarios,
    fully_covered_scenarios: summary.fully_covered_scenarios,
    partially_covered_scenarios: summary.partially_covered_scenarios,
    average_scenario_coverage_ratio: summary.average_scenario_coverage_ratio,
    hero_position_scenario_counts: heroPositionScenarioCounts,
    line_signature_scenario_counts: lineSignatureScenarioCounts,
    scenarios: summary.scenarios,
  };
}

async function runCli() {
  const requestedPath = process.argv[2] ?? path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");
  const outputPath =
    process.argv[3] ??
    path.join(
      path.dirname(requestedPath),
      `${path.basename(requestedPath, path.extname(requestedPath))}.manifest.json`,
    );

  const resolvedPackPath = path.resolve(requestedPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const manifest = await buildPreflopManifest(resolvedPackPath);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`[pack-builder] Wrote manifest for ${manifest.dataset_version} to ${resolvedOutputPath}`);
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
