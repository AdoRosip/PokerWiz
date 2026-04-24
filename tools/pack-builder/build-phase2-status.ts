import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePreflopSolverImportDocument } from "../solver-import/import-preflop-solver";

interface Phase2ValidationFeature {
  name:
    | "scenario_key_semantics"
    | "action_family_semantics"
    | "passive_aggressive_sizing_rules"
    | "scenario_action_size_consistency"
    | "scenario_descriptor_consistency"
    | "document_tree_policy";
  status: "complete" | "missing";
}

export interface Phase2StatusReport {
  phase: "Phase 2";
  status: "complete" | "in_progress";
  named_adapters: string[];
  generic_adapters: string[];
  commands: string[];
  validation_features: Phase2ValidationFeature[];
  workflow_docs_present: boolean;
  deterministic_artifacts_available: string[];
  completion_notes: string[];
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function evaluateValidationFeatures(): Phase2ValidationFeature[] {
  const document = {
    schema_version: 1,
    import_version: 1,
    dataset_version: "phase2_status_probe_v1",
    game: "6max_cash" as const,
    source_solver: "phase2_probe",
    source_format: "canonical_preflop_import_json",
    source_tree: "6max_cash_40bb_btn_vs_co_open_3.0_tree",
    rows: [
      {
        scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
        line_signature: "facing_open" as const,
        stack_bucket: "100bb" as const,
        hero_position: "BTN" as const,
        hand_key: "A5s",
        hand_resolution: "hand_class" as const,
        actions: [
          { action_key: "call", frequency: 0.5, size_bb: 2.5 },
          { action_key: "3bet_7.5bb", frequency: 0.5, size_bb: 7.5 },
        ],
      },
      {
        scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
        line_signature: "facing_open_plus_call" as const,
        stack_bucket: "100bb" as const,
        hero_position: "SB" as const,
        hand_key: "KQs",
        hand_resolution: "hand_class" as const,
        actions: [
          { action_key: "3bet_7.5bb", frequency: 0.5, size_bb: 8 },
          { action_key: "4bet_22bb", frequency: 0.5, size_bb: 22 },
        ],
      },
    ],
  };

  const issues = validatePreflopSolverImportDocument(document).issues.map((issue) => issue.message);
  const hasIssue = (needle: string) => issues.some((message) => message.includes(needle));

  return [
    {
      name: "scenario_key_semantics",
      status:
        hasIssue("hero position BTN does not match entry hero position SB") &&
        hasIssue("line signature facing_open does not match entry line signature facing_open_plus_call")
          ? "complete"
          : "missing",
    },
    {
      name: "action_family_semantics",
      status: hasIssue("is not valid for line signature facing_open_plus_call") ? "complete" : "missing",
    },
    {
      name: "passive_aggressive_sizing_rules",
      status:
        hasIssue("Passive import action call must not include size_bb") ? "complete" : "missing",
    },
    {
      name: "scenario_action_size_consistency",
      status: hasIssue("uses inconsistent size_bb within scenario") ? "complete" : "missing",
    },
    {
      name: "scenario_descriptor_consistency",
      status:
        hasIssue("uses inconsistent line_signature across rows") &&
        hasIssue("uses inconsistent hero_position across rows")
          ? "complete"
          : "missing",
    },
    {
      name: "document_tree_policy",
      status:
        hasIssue("does not match source_tree stack hint 40bb") &&
        hasIssue("does not match source_tree open-size hint 3")
          ? "complete"
          : "missing",
    },
  ];
}

export async function buildPhase2StatusReport(repoRoot: string): Promise<Phase2StatusReport> {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};

  const workflowDocsPresent = await fileExists(path.join(repoRoot, "docs", "pack-workflow.md"));
  const validationFeatures = evaluateValidationFeatures();
  const commands = [
    "normalize:solver:flat",
    "normalize:solver:tabular",
    "normalize:solver:simple-csv-profile",
    "import:solver",
    "validate:pack",
    "build:manifest",
    "build:phase1-status",
    "build:phase2-status",
  ].filter((command) => Boolean(scripts[command]));

  const deterministicArtifactsAvailable = [
    "canonical_import_json",
    "strategy_pack_json",
    "manifest_json",
    "phase1_status_json",
    "phase2_status_json",
  ];

  const adaptersPresent =
    scripts["normalize:solver:flat"] &&
    scripts["normalize:solver:tabular"] &&
    scripts["normalize:solver:simple-csv-profile"];
  const validationComplete = validationFeatures.every((feature) => feature.status === "complete");

  const status =
    adaptersPresent && workflowDocsPresent && validationComplete ? "complete" : "in_progress";
  const completionNotes =
    status === "complete"
      ? [
          "Phase 2 pipeline goals are met: canonical imports are hardened, named and generic adapters exist, and the operator workflow is documented.",
          "Future data growth should flow through raw adapter -> canonical import -> strategy pack instead of direct manual pack editing.",
        ]
      : ["Phase 2 closeout is incomplete; missing workflow or validation items are reflected in this report."];

  return {
    phase: "Phase 2",
    status,
    named_adapters: ["simple_csv_profile_v1"],
    generic_adapters: ["flat_preflop_export_v1", "tabular_preflop_export_v1"],
    commands,
    validation_features: validationFeatures,
    workflow_docs_present: workflowDocsPresent,
    deterministic_artifacts_available: deterministicArtifactsAvailable,
    completion_notes: completionNotes,
  };
}

async function runCli() {
  const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const outputPath =
    process.argv[3] ?? path.join(repoRoot, "data", "dev", "phase2-status.json");

  const resolvedOutputPath = path.resolve(outputPath);
  const report = await buildPhase2StatusReport(repoRoot);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `[phase2-status] ${report.status}: ${report.validation_features.filter((feature) => feature.status === "complete").length}/${report.validation_features.length} validation features complete`,
  );
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
