import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PreflopSolverImportDocument,
  PreflopSolverImportRow,
  PreflopTabularSolverExportDocument,
  PreflopTabularSolverExportRow,
} from "../../shared/contracts";
import type { ValidationIssue } from "../pack-validate/validate-preflop-pack";

const REQUIRED_COLUMNS = [
  "dataset_version",
  "game",
  "source_solver",
  "source_format",
  "source_tree",
  "scenario_key",
  "line_signature",
  "stack_bucket",
  "hero_position",
  "hand_key",
  "hand_resolution",
] as const;

export interface TabularExportNormalizationSummary {
  dataset_version: string;
  row_count: number;
  issues: ValidationIssue[];
}

export async function loadPreflopTabularSolverExportDocument(
  inputPath: string,
): Promise<PreflopTabularSolverExportDocument> {
  const raw = await readFile(inputPath, "utf8");
  return parseTabularPreflopExport(raw);
}

export function parseTabularPreflopExport(raw: string): PreflopTabularSolverExportDocument {
  const parsedRows = parseDelimitedLines(raw, "\t");
  if (parsedRows.length === 0) {
    throw new Error("Tabular preflop export is empty");
  }

  const [header, ...rows] = parsedRows;
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Tabular preflop export is missing required columns: ${missingColumns.join(", ")}`);
  }

  const structuredRows = rows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => rowToObject(header, row))
    .map(buildTabularRow);

  if (structuredRows.length === 0) {
    throw new Error("Tabular preflop export contains no data rows");
  }

  const first = structuredRows[0];

  return {
    schema_version: 1,
    export_version: 1,
    dataset_version: first.dataset_version,
    game: first.game,
    source_solver: first.source_solver,
    source_format: "tabular_preflop_export_v1",
    source_tree: first.source_tree,
    default_source_label: first.default_source_label,
    rows: structuredRows,
  };
}

export function validatePreflopTabularSolverExportDocument(
  document: PreflopTabularSolverExportDocument,
): TabularExportNormalizationSummary {
  const issues: ValidationIssue[] = [];
  const seenRows = new Set<string>();

  if (document.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "Tabular solver export document contains no rows",
    });
  }

  for (const row of document.rows) {
    const rowKey = `${row.scenario_key}::${row.hand_resolution}::${row.hand_key}`;
    if (seenRows.has(rowKey)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Duplicate tabular export row detected for ${rowKey}`,
      });
    } else {
      seenRows.add(rowKey);
    }

    if (row.dataset_version !== document.dataset_version) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Row dataset_version ${row.dataset_version} does not match document dataset_version ${document.dataset_version}`,
      });
    }

    if (row.game !== document.game) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Row game ${row.game} does not match document game ${document.game}`,
      });
    }

    if (row.source_solver !== document.source_solver || row.source_tree !== document.source_tree) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: "Row solver metadata does not match the document-level solver metadata",
      });
    }

    const actionKeys = Object.keys(row.action_frequencies);
    if (actionKeys.length === 0) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: "Tabular export row contains no action frequencies",
      });
    }

    for (const actionKey of actionKeys) {
      const frequency = row.action_frequencies[actionKey];
      if (!Number.isFinite(frequency) || frequency < 0 || frequency > 1) {
        issues.push({
          severity: "error",
          scenario_key: row.scenario_key,
          hand_key: row.hand_key,
          message: `Tabular export action ${actionKey} has invalid frequency ${frequency}`,
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

export function normalizeTabularPreflopExportToCanonicalImport(
  document: PreflopTabularSolverExportDocument,
): PreflopSolverImportDocument {
  const validation = validatePreflopTabularSolverExportDocument(document);
  const errors = validation.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Tabular solver export validation failed with ${errors.length} error(s) for ${document.dataset_version}`,
    );
  }

  const rows: PreflopSolverImportRow[] = document.rows.map((row) => {
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
  });

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

function buildTabularRow(cells: Record<string, string>): PreflopTabularSolverExportRow {
  const actionFrequencies: Record<string, number> = {};
  const actionEvsBb: Record<string, number> = {};
  const actionSizesBb: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(cells)) {
    if (rawValue.trim().length === 0) {
      continue;
    }

    const freqMatch = key.match(/^freq:(.+)$/);
    if (freqMatch) {
      actionFrequencies[freqMatch[1]] = Number(rawValue);
      continue;
    }

    const evMatch = key.match(/^ev:(.+)$/);
    if (evMatch) {
      actionEvsBb[evMatch[1]] = Number(rawValue);
      continue;
    }

    const sizeMatch = key.match(/^size:(.+)$/);
    if (sizeMatch) {
      actionSizesBb[sizeMatch[1]] = Number(rawValue);
    }
  }

  return {
    dataset_version: cells.dataset_version,
    game: cells.game as PreflopTabularSolverExportRow["game"],
    source_solver: cells.source_solver,
    source_format: cells.source_format as "tabular_preflop_export_v1",
    source_tree: cells.source_tree,
    default_source_label: cells.default_source_label || undefined,
    scenario_key: cells.scenario_key,
    line_signature: cells.line_signature as PreflopTabularSolverExportRow["line_signature"],
    stack_bucket: cells.stack_bucket as PreflopTabularSolverExportRow["stack_bucket"],
    hero_position: cells.hero_position as PreflopTabularSolverExportRow["hero_position"],
    hand_key: cells.hand_key,
    hand_resolution: cells.hand_resolution as PreflopTabularSolverExportRow["hand_resolution"],
    tags: cells.tags ? cells.tags.split("|").map((tag) => tag.trim()).filter(Boolean) : undefined,
    source_label: cells.source_label || undefined,
    action_frequencies: actionFrequencies,
    action_evs_bb: Object.keys(actionEvsBb).length > 0 ? actionEvsBb : undefined,
    action_sizes_bb: Object.keys(actionSizesBb).length > 0 ? actionSizesBb : undefined,
  };
}

function rowToObject(header: string[], row: string[]): Record<string, string> {
  return Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""]));
}

function parseDelimitedLines(raw: string, delimiter: string): string[][] {
  return raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => parseDelimitedLine(line, delimiter));
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells;
}

function validateOptionalMap(
  mapName: "action_evs_bb" | "action_sizes_bb",
  map: Record<string, number> | undefined,
  row: PreflopTabularSolverExportRow,
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
    process.argv[2] ?? path.join(process.cwd(), "data", "dev", "preflop-tabular-export.sample.tsv");
  const outputPath =
    process.argv[3] ??
    path.join(path.dirname(requestedPath), `${path.basename(requestedPath, path.extname(requestedPath))}.canonical.json`);

  const resolvedInputPath = path.resolve(requestedPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const document = await loadPreflopTabularSolverExportDocument(resolvedInputPath);
  const normalized = normalizeTabularPreflopExportToCanonicalImport(document);

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
