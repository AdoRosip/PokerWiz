import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PreflopSimpleCsvProfileDocument,
  PreflopSimpleCsvProfileRow,
  PreflopSolverImportAction,
  PreflopSolverImportDocument,
  PreflopSolverImportRow,
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

const ACTION_SLOTS = [1, 2, 3, 4] as const;

export interface SimpleCsvProfileNormalizationSummary {
  dataset_version: string;
  row_count: number;
  issues: ValidationIssue[];
}

export async function loadPreflopSimpleCsvProfileDocument(
  inputPath: string,
): Promise<PreflopSimpleCsvProfileDocument> {
  const raw = await readFile(inputPath, "utf8");
  return parseSimpleCsvProfile(raw);
}

export function parseSimpleCsvProfile(raw: string): PreflopSimpleCsvProfileDocument {
  const parsedRows = parseDelimitedLines(raw, ",");
  if (parsedRows.length === 0) {
    throw new Error("Simple CSV solver profile is empty");
  }

  const [header, ...rows] = parsedRows;
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Simple CSV solver profile is missing required columns: ${missingColumns.join(", ")}`);
  }

  const structuredRows = rows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => rowToObject(header, row))
    .map(buildSimpleCsvProfileRow);

  if (structuredRows.length === 0) {
    throw new Error("Simple CSV solver profile contains no data rows");
  }

  const first = structuredRows[0];

  return {
    schema_version: 1,
    export_version: 1,
    dataset_version: first.dataset_version,
    game: first.game,
    source_solver: first.source_solver,
    source_format: "simple_csv_profile_v1",
    source_tree: first.source_tree,
    default_source_label: first.default_source_label,
    rows: structuredRows,
  };
}

export function validatePreflopSimpleCsvProfileDocument(
  document: PreflopSimpleCsvProfileDocument,
): SimpleCsvProfileNormalizationSummary {
  const issues: ValidationIssue[] = [];
  const seenRows = new Set<string>();

  if (document.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "Simple CSV solver profile contains no rows",
    });
  }

  for (const row of document.rows) {
    const rowKey = `${row.scenario_key}::${row.hand_resolution}::${row.hand_key}`;
    if (seenRows.has(rowKey)) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: `Duplicate simple CSV profile row detected for ${rowKey}`,
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

    if (row.actions.length === 0) {
      issues.push({
        severity: "error",
        scenario_key: row.scenario_key,
        hand_key: row.hand_key,
        message: "Simple CSV profile row contains no action slots with data",
      });
    }
  }

  return {
    dataset_version: document.dataset_version,
    row_count: document.rows.length,
    issues,
  };
}

export function normalizeSimpleCsvProfileToCanonicalImport(
  document: PreflopSimpleCsvProfileDocument,
): PreflopSolverImportDocument {
  const validation = validatePreflopSimpleCsvProfileDocument(document);
  const errors = validation.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Simple CSV solver profile validation failed with ${errors.length} error(s) for ${document.dataset_version}`,
    );
  }

  const rows: PreflopSolverImportRow[] = document.rows.map((row) => ({
    scenario_key: row.scenario_key,
    line_signature: row.line_signature,
    stack_bucket: row.stack_bucket,
    hero_position: row.hero_position,
    hand_key: row.hand_key,
    hand_resolution: row.hand_resolution,
    tags: row.tags,
    source_label: row.source_label,
    actions: [...row.actions].sort(
      (left, right) => right.frequency - left.frequency || left.action_key.localeCompare(right.action_key),
    ),
  }));

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

function buildSimpleCsvProfileRow(cells: Record<string, string>): PreflopSimpleCsvProfileRow {
  const actions: PreflopSolverImportAction[] = [];

  for (const slot of ACTION_SLOTS) {
    const actionKey = cells[`action_${slot}_key`]?.trim();
    const frequencyRaw = cells[`action_${slot}_freq`]?.trim();
    const evRaw = cells[`action_${slot}_ev_bb`]?.trim();
    const sizeRaw = cells[`action_${slot}_size_bb`]?.trim();

    if (!actionKey && !frequencyRaw && !evRaw && !sizeRaw) {
      continue;
    }

    actions.push({
      action_key: actionKey,
      frequency: Number(frequencyRaw),
      ev_bb: evRaw ? Number(evRaw) : undefined,
      size_bb: sizeRaw ? Number(sizeRaw) : undefined,
    });
  }

  return {
    dataset_version: cells.dataset_version,
    game: cells.game as PreflopSimpleCsvProfileRow["game"],
    source_solver: cells.source_solver,
    source_format: cells.source_format as "simple_csv_profile_v1",
    source_tree: cells.source_tree,
    default_source_label: cells.default_source_label || undefined,
    scenario_key: cells.scenario_key,
    line_signature: cells.line_signature as PreflopSimpleCsvProfileRow["line_signature"],
    stack_bucket: cells.stack_bucket as PreflopSimpleCsvProfileRow["stack_bucket"],
    hero_position: cells.hero_position as PreflopSimpleCsvProfileRow["hero_position"],
    hand_key: cells.hand_key,
    hand_resolution: cells.hand_resolution as PreflopSimpleCsvProfileRow["hand_resolution"],
    tags: cells.tags ? cells.tags.split("|").map((tag) => tag.trim()).filter(Boolean) : undefined,
    source_label: cells.source_label || undefined,
    actions,
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

async function runCli() {
  const requestedPath =
    process.argv[2] ?? path.join(process.cwd(), "data", "dev", "preflop-simple-csv-profile.sample.csv");
  const outputPath =
    process.argv[3] ??
    path.join(path.dirname(requestedPath), `${path.basename(requestedPath, path.extname(requestedPath))}.canonical.json`);

  const resolvedInputPath = path.resolve(requestedPath);
  const resolvedOutputPath = path.resolve(outputPath);
  const document = await loadPreflopSimpleCsvProfileDocument(resolvedInputPath);
  const normalized = normalizeSimpleCsvProfileToCanonicalImport(document);

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
