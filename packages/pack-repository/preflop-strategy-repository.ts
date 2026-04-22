import { readFile } from "node:fs/promises";

import type {
  HandIdentity,
  NodeCoverage,
  PackScenarioCoverageSummary,
  PreflopPackSummary,
  ScenarioDescriptor,
  StrategyEntry,
  StrategyLookupResult,
  StrategyPack,
} from "../../shared/contracts";
import { scenarioApproximationSignature } from "../game-domain";

const TOTAL_PREFLOP_HAND_CLASSES = 169;

export class PreflopStrategyRepository {
  private readonly entriesByScenario = new Map<string, StrategyEntry[]>();
  private readonly coverageByScenario = new Map<string, NodeCoverage>();
  private readonly packSummary: PreflopPackSummary;

  constructor(private readonly pack: StrategyPack) {
    for (const entry of pack.entries) {
      const bucket = this.entriesByScenario.get(entry.scenario_key) ?? [];
      bucket.push(entry);
      this.entriesByScenario.set(entry.scenario_key, bucket);
    }

    for (const [scenarioKey, entries] of this.entriesByScenario.entries()) {
      this.coverageByScenario.set(scenarioKey, this.buildCoverage(scenarioKey, entries));
    }

    this.packSummary = this.buildPackSummary();
  }

  static async fromFile(path: string): Promise<PreflopStrategyRepository> {
    const raw = await readFile(path, "utf8");
    const pack = JSON.parse(raw) as StrategyPack;
    return new PreflopStrategyRepository(pack);
  }

  lookup(scenario: ScenarioDescriptor, handIdentity: HandIdentity): StrategyLookupResult | null {
    const exactEntries = this.entriesByScenario.get(scenario.scenario_key);
    let warnings = [...scenario.warnings];
    let datasetMatch: StrategyLookupResult["dataset_match"];
    let candidates: StrategyEntry[];

    if (exactEntries) {
      candidates = exactEntries;
      datasetMatch = "exact_node";
    } else {
      const approximated = this.findApproximateScenarioEntries(scenario);
      if (!approximated) {
        return null;
      }

      candidates = approximated;
      datasetMatch = "approximated_node";
      warnings = [
        ...warnings,
        `Exact node ${scenario.scenario_key} was unavailable; nearest supported scenario prefix approximation used.`,
      ];
    }

    const comboHit = candidates.find(
      (entry) => entry.hand_resolution === "combo" && entry.hand_key === handIdentity.combo,
    );
    if (comboHit) {
      return {
        entry: comboHit,
        dataset_match: datasetMatch,
        warnings,
        node_coverage: this.coverageForScenario(comboHit.scenario_key),
      };
    }

    const handClassHit = candidates.find(
      (entry) => entry.hand_resolution === "hand_class" && entry.hand_key === handIdentity.hand_class,
    );
    if (!handClassHit) {
      return null;
    }

    return {
      entry: handClassHit,
      dataset_match: datasetMatch,
      warnings,
      node_coverage: this.coverageForScenario(handClassHit.scenario_key),
    };
  }

  nearestSupportedScenarioKeys(scenario: ScenarioDescriptor, limit = 3): string[] {
    const parsed = scenarioApproximationSignature(scenario.scenario_key);
    if (!parsed) {
      return [];
    }

    return Array.from(this.entriesByScenario.keys())
      .map((scenarioKey) => {
        const candidate = scenarioApproximationSignature(scenarioKey);
        if (!candidate || candidate.prefix !== parsed.prefix) {
          return null;
        }
        return { scenarioKey, distance: Math.abs(candidate.open_size_bb - parsed.open_size_bb) };
      })
      .filter((candidate): candidate is { scenarioKey: string; distance: number } => candidate !== null)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, limit)
      .map((candidate) => candidate.scenarioKey);
  }

  coverageForScenario(scenarioKey: string): NodeCoverage {
    return (
      this.coverageByScenario.get(scenarioKey) ?? {
        total_hand_classes: TOTAL_PREFLOP_HAND_CLASSES,
        covered_hand_classes: 0,
        coverage_ratio: 0,
        is_complete: false,
        matched_scenario_key: scenarioKey,
      }
    );
  }

  summary(): PreflopPackSummary {
    return this.packSummary;
  }

  private findApproximateScenarioEntries(scenario: ScenarioDescriptor): StrategyEntry[] | undefined {
    const parsed = scenarioApproximationSignature(scenario.scenario_key);
    if (!parsed) {
      return undefined;
    }

    let bestMatch: { entries: StrategyEntry[]; distance: number } | null = null;

    for (const [scenarioKey, entries] of this.entriesByScenario.entries()) {
      const candidate = scenarioApproximationSignature(scenarioKey);
      if (!candidate) continue;
      if (
        candidate.prefix !== parsed.prefix ||
        candidate.line_suffix !== parsed.line_suffix ||
        candidate.has_call_suffix !== parsed.has_call_suffix
      ) {
        continue;
      }

      const distance = Math.abs(candidate.open_size_bb - parsed.open_size_bb);
      if (distance > 0.6) continue;
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { entries, distance };
      }
    }

    return bestMatch?.entries;
  }

  private buildCoverage(scenarioKey: string, entries: StrategyEntry[]): NodeCoverage {
    const coveredHandClasses = new Set(
      entries.filter((entry) => entry.hand_resolution === "hand_class").map((entry) => entry.hand_key),
    ).size;

    return {
      total_hand_classes: TOTAL_PREFLOP_HAND_CLASSES,
      covered_hand_classes: coveredHandClasses,
      coverage_ratio: coveredHandClasses / TOTAL_PREFLOP_HAND_CLASSES,
      is_complete: coveredHandClasses >= TOTAL_PREFLOP_HAND_CLASSES,
      matched_scenario_key: scenarioKey,
    };
  }

  private buildPackSummary(): PreflopPackSummary {
    const scenarios: PackScenarioCoverageSummary[] = Array.from(this.entriesByScenario.entries())
      .map(([scenarioKey, entries]) => {
        const first = entries[0];
        const coverage = this.coverageForScenario(scenarioKey);
        return {
          ...coverage,
          hero_position: first.hero_position,
          line_signature: first.line_signature,
        };
      })
      .sort((left, right) => right.coverage_ratio - left.coverage_ratio || left.matched_scenario_key.localeCompare(right.matched_scenario_key));

    const fullyCovered = scenarios.filter((scenario) => scenario.is_complete).length;
    const partiallyCovered = scenarios.filter((scenario) => scenario.covered_hand_classes > 0 && !scenario.is_complete).length;
    const totalCoverageRatio = scenarios.reduce((sum, scenario) => sum + scenario.coverage_ratio, 0);

    return {
      dataset_version: this.pack.dataset_version,
      game: this.pack.game,
      total_scenarios: scenarios.length,
      total_entries: this.pack.entries.length,
      fully_covered_scenarios: fullyCovered,
      partially_covered_scenarios: partiallyCovered,
      empty_scenarios_observed: 0,
      average_scenario_coverage_ratio: scenarios.length === 0 ? 0 : totalCoverageRatio / scenarios.length,
      scenarios,
    };
  }
}
