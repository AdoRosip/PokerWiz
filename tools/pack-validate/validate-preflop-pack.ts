import { readFile } from "node:fs/promises";
import path from "node:path";

import type { StrategyEntry, StrategyPack } from "../../shared/contracts";
import { validateScenarioKeyAgainstEntry } from "../../packages/game-domain";

const KNOWN_LINE_SIGNATURES = new Set([
  "first_in",
  "facing_open",
  "facing_open_plus_call",
  "facing_open_and_3bet",
  "facing_open_3bet_4bet",
]);

const FREQUENCY_TOLERANCE = 0.015;

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  scenario_key?: string;
  hand_key?: string;
}

export interface ValidationSummary {
  dataset_version: string;
  entry_count: number;
  scenario_count: number;
  issues: ValidationIssue[];
}

export async function loadStrategyPack(packPath: string): Promise<StrategyPack> {
  const raw = await readFile(packPath, "utf8");
  return JSON.parse(raw) as StrategyPack;
}

export function validateStrategyPack(pack: StrategyPack): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const seenRows = new Set<string>();
  const scenarios = new Set<string>();

  for (const entry of pack.entries) {
    scenarios.add(entry.scenario_key);
    validateEntry(entry, seenRows, issues);
  }

  return {
    dataset_version: pack.dataset_version,
    entry_count: pack.entries.length,
    scenario_count: scenarios.size,
    issues,
  };
}

function validateEntry(entry: StrategyEntry, seenRows: Set<string>, issues: ValidationIssue[]) {
  const rowKey = `${entry.scenario_key}::${entry.hand_resolution}::${entry.hand_key}`;
  if (seenRows.has(rowKey)) {
    issues.push({
      severity: "error",
      scenario_key: entry.scenario_key,
      hand_key: entry.hand_key,
      message: `Duplicate strategy row detected for ${rowKey}`,
    });
  } else {
    seenRows.add(rowKey);
  }

  if (!KNOWN_LINE_SIGNATURES.has(entry.line_signature)) {
    issues.push({
      severity: "error",
      scenario_key: entry.scenario_key,
      hand_key: entry.hand_key,
      message: `Unknown line signature: ${entry.line_signature}`,
    });
  }

  for (const issue of validateScenarioKeyAgainstEntry(entry)) {
    issues.push({
      severity: "error",
      scenario_key: entry.scenario_key,
      hand_key: entry.hand_key,
      message: issue,
    });
  }

  if (entry.actions.length === 0) {
    issues.push({
      severity: "error",
      scenario_key: entry.scenario_key,
      hand_key: entry.hand_key,
      message: "Strategy row contains no actions",
    });
    return;
  }

  const frequencySum = entry.actions.reduce((sum, action) => sum + action.frequency, 0);
  if (Math.abs(frequencySum - 1) > FREQUENCY_TOLERANCE) {
    issues.push({
      severity: "error",
      scenario_key: entry.scenario_key,
      hand_key: entry.hand_key,
      message: `Action frequencies sum to ${frequencySum.toFixed(4)} instead of 1.0000`,
    });
  }

  for (const action of entry.actions) {
    if (action.frequency < 0 || action.frequency > 1) {
      issues.push({
        severity: "error",
        scenario_key: entry.scenario_key,
        hand_key: entry.hand_key,
        message: `Invalid action frequency ${action.frequency} for ${action.action_key}`,
      });
    }

    if (isAggressiveAction(action.action_key) && (action.size_bb == null || action.size_bb <= 0)) {
      issues.push({
        severity: "error",
        scenario_key: entry.scenario_key,
        hand_key: entry.hand_key,
        message: `Aggressive action ${action.action_key} is missing a positive size`,
      });
    }

    if (!isAggressiveAction(action.action_key) && action.size_bb != null) {
      issues.push({
        severity: "warning",
        scenario_key: entry.scenario_key,
        hand_key: entry.hand_key,
        message: `Passive action ${action.action_key} should usually not include size_bb`,
      });
    }
  }
}

function isAggressiveAction(actionKey: string): boolean {
  return /^(raise|3bet|4bet|5bet_jam)/i.test(actionKey);
}

async function runCli() {
  const requestedPath = process.argv[2] ?? path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");
  const resolvedPath = path.resolve(requestedPath);
  const pack = await loadStrategyPack(resolvedPath);
  const summary = validateStrategyPack(pack);

  const errorCount = summary.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = summary.issues.filter((issue) => issue.severity === "warning").length;

  console.log(
    `[pack-validate] ${summary.dataset_version}: ${summary.entry_count} rows across ${summary.scenario_count} scenarios`,
  );

  for (const issue of summary.issues) {
    const location = [issue.scenario_key, issue.hand_key].filter(Boolean).join(" / ");
    console.log(`[${issue.severity}] ${location}: ${issue.message}`);
  }

  if (errorCount > 0) {
    throw new Error(`Pack validation failed with ${errorCount} error(s) and ${warningCount} warning(s)`);
  }

  console.log(`[pack-validate] Passed with ${warningCount} warning(s).`);
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
