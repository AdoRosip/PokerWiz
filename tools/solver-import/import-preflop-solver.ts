import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PreflopSolverImportDocument,
  PreflopSolverImportRow,
  StrategyEntry,
  StrategyPack,
} from "../../shared/contracts";
import { validateScenarioKeyAgainstEntry } from "../../packages/game-domain";
import { validateStrategyPack, type ValidationIssue } from "../pack-validate/validate-preflop-pack";

export interface SolverImportValidationSummary {
  dataset_version: string;
  row_count: number;
  issues: ValidationIssue[];
}

export async function loadPreflopSolverImportDocument(
  importPath: string,
): Promise<PreflopSolverImportDocument> {
  const raw = await readFile(importPath, "utf8");
  return JSON.parse(raw) as PreflopSolverImportDocument;
}

export function validatePreflopSolverImportDocument(
  document: PreflopSolverImportDocument,
): SolverImportValidationSummary {
  const issues: ValidationIssue[] = [];
  const seenRows = new Set<string>();

  if (document.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "Solver import document contains no rows",
    });
  }

  for (const row of document.rows) {
    validateImportRow(row, seenRows, issues);
  }

  return {
    dataset_version: document.dataset_version,
    row_count: document.rows.length,
    issues,
  };
}

export function convertPreflopSolverImportToStrategyPack(
  document: PreflopSolverImportDocument,
): StrategyPack {
  const importValidation = validatePreflopSolverImportDocument(document);
  const importErrors = importValidation.issues.filter((issue) => issue.severity === "error");
  if (importErrors.length > 0) {
    throw new Error(
      `Solver import validation failed with ${importErrors.length} error(s) for ${document.dataset_version}`,
    );
  }

  const entries: StrategyEntry[] = document.rows.map((row) => ({
    scenario_key: row.scenario_key,
    line_signature: row.line_signature,
    stack_bucket: row.stack_bucket,
    hero_position: row.hero_position,
    hand_key: row.hand_key,
    hand_resolution: row.hand_resolution,
    actions: row.actions.map((action) => ({
      action_key: action.action_key,
      frequency: action.frequency,
      ev_bb: action.ev_bb,
      size_bb: action.size_bb,
    })),
    tags: [...new Set(row.tags ?? [])],
    source: row.source_label ?? document.default_source_label ?? document.source_solver,
  }));

  const pack: StrategyPack = {
    schema_version: 1,
    dataset_version: document.dataset_version,
    game: document.game,
    entries,
  };

  const strategyValidation = validateStrategyPack(pack);
  const strategyErrors = strategyValidation.issues.filter((issue) => issue.severity === "error");
  if (strategyErrors.length > 0) {
    throw new Error(
      `Converted strategy pack validation failed with ${strategyErrors.length} error(s) for ${document.dataset_version}`,
    );
  }

  return pack;
}

function validateImportRow(
  row: PreflopSolverImportRow,
  seenRows: Set<string>,
  issues: ValidationIssue[],
) {
  const rowKey = `${row.scenario_key}::${row.hand_resolution}::${row.hand_key}`;
  if (seenRows.has(rowKey)) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: `Duplicate import row detected for ${rowKey}`,
    });
  } else {
    seenRows.add(rowKey);
  }

  if (row.actions.length === 0) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: "Import row contains no actions",
    });
  }

  if ((row.tags ?? []).some((tag) => tag.trim().length === 0)) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: "Import row contains an empty tag",
    });
  }

  validateScenarioMetadataConsistency(row, issues);
  validateImportActions(row, issues);
}

function validateScenarioMetadataConsistency(row: PreflopSolverImportRow, issues: ValidationIssue[]) {
  for (const issue of validateScenarioKeyAgainstEntry({
    scenario_key: row.scenario_key,
    stack_bucket: row.stack_bucket,
    hero_position: row.hero_position,
    line_signature: row.line_signature,
  })) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: issue,
    });
  }
}

function validateImportActions(row: PreflopSolverImportRow, issues: ValidationIssue[]) {
  for (const action of row.actions) {
    if (!Number.isFinite(action.frequency) || action.frequency < 0 || action.frequency > 1) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import action ${action.action_key} has invalid frequency ${action.frequency}`,
      });
    }

    if (action.ev_bb != null && !Number.isFinite(action.ev_bb)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import action ${action.action_key} has invalid ev_bb ${action.ev_bb}`,
      });
    }

    if (action.size_bb != null && (!Number.isFinite(action.size_bb) || action.size_bb <= 0)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import action ${action.action_key} has invalid size_bb ${action.size_bb}`,
      });
    }
  }
}

async function runCli() {
  const requestedPath =
    process.argv[2] ?? path.join(process.cwd(), "data", "dev", "preflop-solver-import.sample.json");
  const outputPath =
    process.argv[3] ??
    path.join(path.dirname(requestedPath), `${path.basename(requestedPath, path.extname(requestedPath))}.pack.json`);

  const resolvedInputPath = path.resolve(requestedPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const document = await loadPreflopSolverImportDocument(resolvedInputPath);
  const pack = convertPreflopSolverImportToStrategyPack(document);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  console.log(
    `[solver-import] Wrote ${pack.entries.length} rows for ${pack.dataset_version} to ${resolvedOutputPath}`,
  );
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
