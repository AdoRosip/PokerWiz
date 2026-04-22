import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PreflopStrategyRepository } from "../../packages/pack-repository/preflop-strategy-repository";
import type { PackScenarioCoverageSummary } from "../../shared/contracts";
import { loadStrategyPack } from "../pack-validate/validate-preflop-pack";

const PRIORITY_FAMILIES = [
  "6max_cash_100bb_UTG_first_in",
  "6max_cash_100bb_HJ_first_in",
  "6max_cash_100bb_CO_first_in",
  "6max_cash_100bb_BTN_first_in",
  "6max_cash_100bb_SB_first_in",
  "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
  "6max_cash_100bb_BTN_vs_HJ_open_2.5bb",
  "6max_cash_100bb_BB_vs_BTN_open_2.5bb",
  "6max_cash_100bb_SB_vs_BTN_open_2.5bb",
  "6max_cash_100bb_BB_vs_CO_open_2.5bb",
  "6max_cash_100bb_SB_vs_CO_open_2.5bb",
  "6max_cash_100bb_BB_vs_HJ_open_2.5bb",
  "6max_cash_100bb_SB_vs_HJ_open_2.5bb",
  "6max_cash_100bb_BB_vs_UTG_open_2bb",
  "6max_cash_100bb_BTN_vs_UTG_open_2bb",
  "6max_cash_100bb_BTN_vs_UTG_open_2bb_HJ_call",
  "6max_cash_100bb_BB_vs_BTN_open_2.5bb_SB_call",
  "6max_cash_100bb_SB_vs_HJ_open_2.5bb_CO_3bet_8bb",
  "6max_cash_100bb_BTN_vs_UTG_open_2.5bb_HJ_3bet_8bb_CO_4bet_22bb",
] as const;

export interface Phase1StatusReport {
  phase: "Phase 1";
  status: "complete" | "in_progress";
  dataset_version: string;
  total_scenarios: number;
  total_entries: number;
  average_scenario_coverage_ratio: number;
  priority_families_expected: number;
  priority_families_present: number;
  missing_priority_families: string[];
  priority_families: PackScenarioCoverageSummary[];
  completion_notes: string[];
}

export async function buildPhase1StatusReport(packPath: string): Promise<Phase1StatusReport> {
  const pack = await loadStrategyPack(packPath);
  const repository = new PreflopStrategyRepository(pack);
  const summary = repository.summary();

  const scenarioMap = new Map(summary.scenarios.map((scenario) => [scenario.matched_scenario_key, scenario]));
  const priorityFamilies = PRIORITY_FAMILIES.map((scenarioKey) => scenarioMap.get(scenarioKey)).filter(
    (scenario): scenario is PackScenarioCoverageSummary => Boolean(scenario),
  );
  const missingPriorityFamilies = PRIORITY_FAMILIES.filter((scenarioKey) => !scenarioMap.has(scenarioKey));

  const status = missingPriorityFamilies.length === 0 ? "complete" : "in_progress";
  const completionNotes =
    status === "complete"
      ? [
          "All documented Phase 1 priority preflop families are present in the current dev pack.",
          "Phase 1 runtime tooling now includes validation, manifest generation, canonical import conversion, and a first raw-export normalizer.",
        ]
      : ["Phase 1 priority family coverage is still incomplete; missing families are listed in this report."];

  return {
    phase: "Phase 1",
    status,
    dataset_version: summary.dataset_version,
    total_scenarios: summary.total_scenarios,
    total_entries: summary.total_entries,
    average_scenario_coverage_ratio: summary.average_scenario_coverage_ratio,
    priority_families_expected: PRIORITY_FAMILIES.length,
    priority_families_present: priorityFamilies.length,
    missing_priority_families: missingPriorityFamilies,
    priority_families: priorityFamilies,
    completion_notes: completionNotes,
  };
}

async function runCli() {
  const requestedPath = process.argv[2] ?? path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");
  const outputPath =
    process.argv[3] ?? path.join(process.cwd(), "data", "dev", "phase1-status.json");

  const resolvedPackPath = path.resolve(requestedPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const report = await buildPhase1StatusReport(resolvedPackPath);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `[phase1-status] ${report.status}: ${report.priority_families_present}/${report.priority_families_expected} priority families present in ${report.dataset_version}`,
  );
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
