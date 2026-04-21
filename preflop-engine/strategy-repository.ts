import { readFile } from "node:fs/promises";

import type {
  HandIdentity,
  ScenarioDescriptor,
  StrategyEntry,
  StrategyLookupResult,
  StrategyPack,
} from "../shared/contracts";

export class InMemoryStrategyRepository {
  private readonly entriesByScenario = new Map<string, StrategyEntry[]>();

  constructor(private readonly pack: StrategyPack) {
    for (const entry of pack.entries) {
      const bucket = this.entriesByScenario.get(entry.scenario_key) ?? [];
      bucket.push(entry);
      this.entriesByScenario.set(entry.scenario_key, bucket);
    }
  }

  static async fromFile(path: string): Promise<InMemoryStrategyRepository> {
    const raw = await readFile(path, "utf8");
    const pack = JSON.parse(raw) as StrategyPack;
    return new InMemoryStrategyRepository(pack);
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
    };
  }

  nearestSupportedScenarioKeys(scenario: ScenarioDescriptor, limit = 3): string[] {
    const parsed = this.parseScenarioKey(scenario.scenario_key);
    if (!parsed) {
      return [];
    }

    return Array.from(this.entriesByScenario.keys())
      .map((scenarioKey) => {
        const candidate = this.parseScenarioKey(scenarioKey);
        if (!candidate || candidate.prefix !== parsed.prefix) {
          return null;
        }

        const distance = Math.abs(candidate.openSizeBb - parsed.openSizeBb);
        return { scenarioKey, distance };
      })
      .filter((candidate): candidate is { scenarioKey: string; distance: number } => candidate !== null)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, limit)
      .map((candidate) => candidate.scenarioKey);
  }

  private findApproximateScenarioEntries(scenario: ScenarioDescriptor): StrategyEntry[] | undefined {
    const parsed = this.parseScenarioKey(scenario.scenario_key);
    if (!parsed) {
      return undefined;
    }

    let bestMatch: { entries: StrategyEntry[]; distance: number } | null = null;

    for (const [scenarioKey, entries] of this.entriesByScenario.entries()) {
      const candidate = this.parseScenarioKey(scenarioKey);
      if (!candidate) {
        continue;
      }

      if (
        candidate.prefix !== parsed.prefix ||
        candidate.lineSuffix !== parsed.lineSuffix ||
        candidate.hasCallSuffix !== parsed.hasCallSuffix
      ) {
        continue;
      }

      const distance = Math.abs(candidate.openSizeBb - parsed.openSizeBb);
      if (distance > 0.6) {
        continue;
      }

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { entries, distance };
      }
    }

    return bestMatch?.entries;
  }

  private parseScenarioKey(scenarioKey: string):
    | {
        prefix: string;
        openSizeBb: number;
        hasCallSuffix: boolean;
        lineSuffix: string;
      }
    | undefined {
    const openMatch = scenarioKey.match(/^(.*)_open_([0-9]+(?:\.[0-9]+)?)bb(.*)$/);
    if (!openMatch) {
      return undefined;
    }

    return {
      prefix: openMatch[1],
      openSizeBb: Number(openMatch[2]),
      hasCallSuffix: openMatch[3].includes("_call"),
      lineSuffix: openMatch[3].replace(/_[A-Z]{2,3}_call$/, ""),
    };
  }
}
