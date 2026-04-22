import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PreflopFlatSolverExportDocument,
  PreflopFlatSolverExportRow,
  PreflopSolverImportDocument,
  PreflopSolverImportRow,
} from "../../shared/contracts";
import type { ValidationIssue } from "../pack-validate/validate-preflop-pack";

export interface FlatExportNormalizationSummary {
  dataset_version: string;
  row_count: number;
  issues: ValidationIssue[];
}

export async function loadPreflopFlatSolverExportDocument(
  inputPath: string,
): Promise<PreflopFlatSolverExportDocument> {
  const raw = await readFile(inputPath, "utf8");
  return JSON.parse(raw) as PreflopFlatSolverExportDocument;
}

export function validatePreflopFlatSolverExportDocument(
  document: PreflopFlatSolverExportDocument,
): FlatExportNormalizationSummary {
  const issues: ValidationIssue[] = [];
  const seenRows = new Set<string>();

  if (document.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "Flat solver export document contains no rows",
    });
  }

  for (const row of document.rows) {
    const rowKey = `${row.scenario_key}::${row.hand_resolution}::${row.hand_key}`;
    if (seenRows.has(rowKey)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Duplicate flat export row detected for ${rowKey}`,
      });
    } else {
      seenRows.add(rowKey);
    }

    const actionKeys = Object.keys(row.action_frequencies);
    if (actionKeys.length === 0) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: "Flat export row contains no action frequencies",
      });
    }

    for (const actionKey of actionKeys) {
      const frequency = row.action_frequencies[actionKey];
      if (!Number.isFinite(frequency) || frequency < 0 || frequency > 1) {
        issues.push({
          severity: "error",
          scenario_key: row.scenario_key,
          hand_key: row.hand_key,
          message: `Flat export action ${actionKey} has invalid frequency ${frequency}`,
        });
      }
    }

    validateOptionalMap("action_evs_bb", row.action_evs_bb, row, actionKeys, issues);
    validateOptionalMap("action_sizes_bb", row.action_sizes_bb, row, actionKeys, issues);
  }

  return {
    dataset_version: document.dataset_version,
    row_count: document.rows.length,
    issues,
  };
}

export function normalizeFlatPreflopExportToCanonicalImport(
  document: PreflopFlatSolverExportDocument,
): PreflopSolverImportDocument {
  const validation = validatePreflopFlatSolverExportDocument(document);
  const errors = validation.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Flat solver export validation failed with ${errors.length} error(s) for ${document.dataset_version}`,
    );
  }

  const rows: PreflopSolverImportRow[] = document.rows.map((row) => normalizeRow(row));

  return {
    schema_version: 1,
    import_version: 1,
    dataset_version: document.dataset_version,
    game: document.game,
    source_solver: document.source_solver,
    source_format: document.source_format,
    source_tree: document.source_tree,
    default_source_label: document.default_source_label,
    rows,
  };
}

function normalizeRow(row: PreflopFlatSolverExportRow): PreflopSolverImportRow {
  const orderedActionKeys = Object.entries(row.action_frequencies)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([actionKey]) => actionKey);

  return {
    scenario_key: row.scenario_key,
    line_signature: row.line_signature,
    stack_bucket: row.stack_bucket,
    hero_position: row.hero_position,
    hand_key: row.hand_key,
    hand_resolution: row.hand_resolution,
    tags: row.tags,
    source_label: row.source_label,
    actions: orderedActionKeys.map((actionKey) => ({
      action_key: actionKey,
      frequency: row.action_frequencies[actionKey],
      ev_bb: row.action_evs_bb?.[actionKey],
      size_bb: row.action_sizes_bb?.[actionKey],
    })),
  };
}

function validateOptionalMap(
  mapName: "action_evs_bb" | "action_sizes_bb",
  map: Record<string, number> | undefined,
  row: PreflopFlatSolverExportRow,
  validActionKeys: string[],
  issues: ValidationIssue[],
) {
  if (!map) {
    return;
  }

  for (const [actionKey, value] of Object.entries(map)) {
    if (!validActionKeys.includes(actionKey)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `${mapName} contains unknown action key ${actionKey}`,
      });
      continue;
    }

    if (!Number.isFinite(value)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `${mapName} contains invalid value ${value} for ${actionKey}`,
      });
    }
  }
}

async function runCli() {
  const requestedPath =
    process.argv[2] ?? path.join(process.cwd(), "data", "dev", "preflop-flat-export.sample.json");
  const outputPath =
    process.argv[3] ??
    path.join(path.dirname(requestedPath), `${path.basename(requestedPath, path.extname(requestedPath))}.canonical.json`);

  const resolvedInputPath = path.resolve(requestedPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const document = await loadPreflopFlatSolverExportDocument(resolvedInputPath);
  const normalized = normalizeFlatPreflopExportToCanonicalImport(document);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  console.log(
    `[solver-import] Wrote canonical import with ${normalized.rows.length} rows for ${normalized.dataset_version} to ${resolvedOutputPath}`,
  );
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
