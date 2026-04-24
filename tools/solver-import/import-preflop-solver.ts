import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PreflopSolverImportDocument,
  PreflopSolverImportRow,
  StrategyEntry,
  StrategyPack,
} from "../../shared/contracts";
import { parseScenarioKey, validateScenarioKeyAgainstEntry } from "../../packages/game-domain";
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
  const scenarioActionSizes = new Map<string, Map<string, number | null>>();
  const scenarioDescriptors = new Map<
    string,
    Pick<PreflopSolverImportRow, "line_signature" | "stack_bucket" | "hero_position">
  >();

  if (document.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "Solver import document contains no rows",
    });
  }

  validateDocumentTreePolicy(document, issues);

  for (const row of document.rows) {
    validateImportRow(row, seenRows, scenarioDescriptors, scenarioActionSizes, issues);
  }

  return {
    dataset_version: document.dataset_version,
    row_count: document.rows.length,
    issues,
  };
}

function validateDocumentTreePolicy(document: PreflopSolverImportDocument, issues: ValidationIssue[]) {
  const stackBucketHint = document.source_tree.match(/(?:^|_)(20bb|40bb|60bb|100bb|150bb_plus)(?:_|$)/)?.[1];
  const openSizeHintRaw = document.source_tree.match(/open_([0-9]+(?:\.[0-9]+)?)/)?.[1];
  const openSizeHint = openSizeHintRaw ? Number(openSizeHintRaw) : undefined;

  for (const row of document.rows) {
    if (stackBucketHint && row.stack_bucket !== stackBucketHint) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Row stack_bucket ${row.stack_bucket} does not match source_tree stack hint ${stackBucketHint}`,
      });
    }

    if (openSizeHint != null) {
      const parsedScenario = parseScenarioKey(row.scenario_key);
      if (parsedScenario?.open_size_bb != null && Math.abs(parsedScenario.open_size_bb - openSizeHint) > 0.001) {
        issues.push({
          severity: "error",
          scenario_key: row.scenario_key,
          hand_key: row.hand_key,
          message: `Scenario open size ${parsedScenario.open_size_bb}bb does not match source_tree open-size hint ${openSizeHint}bb`,
        });
      }
    }
  }
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
  scenarioDescriptors: Map<
    string,
    Pick<PreflopSolverImportRow, "line_signature" | "stack_bucket" | "hero_position">
  >,
  scenarioActionSizes: Map<string, Map<string, number | null>>,
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
  validateScenarioDescriptorConsistency(row, scenarioDescriptors, issues);
  validateImportActions(row, scenarioActionSizes, issues);
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

function validateScenarioDescriptorConsistency(
  row: PreflopSolverImportRow,
  scenarioDescriptors: Map<
    string,
    Pick<PreflopSolverImportRow, "line_signature" | "stack_bucket" | "hero_position">
  >,
  issues: ValidationIssue[],
) {
  const existing = scenarioDescriptors.get(row.scenario_key);
  if (!existing) {
    scenarioDescriptors.set(row.scenario_key, {
      line_signature: row.line_signature,
      stack_bucket: row.stack_bucket,
      hero_position: row.hero_position,
    });
    return;
  }

  if (existing.line_signature !== row.line_signature) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: `Scenario ${row.scenario_key} uses inconsistent line_signature across rows`,
    });
  }

  if (existing.stack_bucket !== row.stack_bucket) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: `Scenario ${row.scenario_key} uses inconsistent stack_bucket across rows`,
    });
  }

  if (existing.hero_position !== row.hero_position) {
    issues.push({
      severity: "error",
      scenario_key: row.scenario_key,
      hand_key: row.hand_key,
      message: `Scenario ${row.scenario_key} uses inconsistent hero_position across rows`,
    });
  }
}

function validateImportActions(
  row: PreflopSolverImportRow,
  scenarioActionSizes: Map<string, Map<string, number | null>>,
  issues: ValidationIssue[],
) {
  const seenActionKeys = new Set<string>();
  const actionSizesForScenario =
    scenarioActionSizes.get(row.scenario_key) ?? new Map<string, number | null>();
  scenarioActionSizes.set(row.scenario_key, actionSizesForScenario);

  for (const action of row.actions) {
    if (seenActionKeys.has(action.action_key)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import row contains duplicate action key ${action.action_key}`,
      });
    } else {
      seenActionKeys.add(action.action_key);
    }

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

    const actionFamily = classifyActionKey(action.action_key);
    if (actionFamily === "unknown") {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import action ${action.action_key} does not map to a supported preflop action family`,
      });
      continue;
    }

    if (!allowedActionFamiliesForLineSignature(row.line_signature).includes(actionFamily)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import action ${action.action_key} is not valid for line signature ${row.line_signature}`,
      });
    }

    if (isAggressiveActionFamily(actionFamily) && action.size_bb == null) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Aggressive import action ${action.action_key} requires size_bb`,
      });
    }

    if (!isAggressiveActionFamily(actionFamily) && action.size_bb != null) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Passive import action ${action.action_key} must not include size_bb`,
      });
    }

    const normalizedSize = action.size_bb == null ? null : Math.round(action.size_bb * 1000) / 1000;
    if (!actionSizesForScenario.has(action.action_key)) {
      actionSizesForScenario.set(action.action_key, normalizedSize);
    } else if (actionSizesForScenario.get(action.action_key) !== normalizedSize) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Import action ${action.action_key} uses inconsistent size_bb within scenario ${row.scenario_key}`,
      });
    }
  }
}

type ActionFamily = "fold" | "call" | "raise" | "3bet" | "4bet" | "5bet_jam" | "unknown";

function classifyActionKey(actionKey: string): ActionFamily {
  const key = actionKey.toLowerCase();
  if (key.startsWith("fold")) return "fold";
  if (key.startsWith("call")) return "call";
  if (key.startsWith("5bet_jam")) return "5bet_jam";
  if (key.startsWith("4bet")) return "4bet";
  if (key.startsWith("3bet")) return "3bet";
  if (key.startsWith("raise") || key.startsWith("open")) return "raise";
  return "unknown";
}

function isAggressiveActionFamily(actionFamily: ActionFamily): boolean {
  return actionFamily === "raise" || actionFamily === "3bet" || actionFamily === "4bet" || actionFamily === "5bet_jam";
}

function allowedActionFamiliesForLineSignature(
  lineSignature: PreflopSolverImportRow["line_signature"],
): ActionFamily[] {
  switch (lineSignature) {
    case "first_in":
      return ["fold", "raise", "5bet_jam"];
    case "facing_open":
    case "facing_open_plus_call":
      return ["fold", "call", "3bet", "5bet_jam"];
    case "facing_open_and_3bet":
      return ["fold", "call", "4bet", "5bet_jam"];
    case "facing_open_3bet_4bet":
      return ["fold", "call", "5bet_jam"];
    default:
      return [];
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
