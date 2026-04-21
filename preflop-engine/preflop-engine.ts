import type { EvaluatePreflopRequest, PreflopEvaluationResult } from "../shared/contracts";
import { DecisionService } from "./decision-service";
import { ExplanationService } from "./explanation-service";
import { NormalizationService } from "./normalization";
import { InMemoryStrategyRepository } from "./strategy-repository";
import { ScenarioMapper } from "./scenario-mapper";

export class PreflopEngine {
  constructor(
    private readonly repository: InMemoryStrategyRepository,
    private readonly normalizer = new NormalizationService(),
    private readonly mapper = new ScenarioMapper(),
    private readonly decisionService = new DecisionService(),
    private readonly explanationService = new ExplanationService(),
  ) {}

  static async fromFile(path: string): Promise<PreflopEngine> {
    const repository = await InMemoryStrategyRepository.fromFile(path);
    return new PreflopEngine(repository);
  }

  evaluate(request: EvaluatePreflopRequest): PreflopEvaluationResult {
    const normalized = this.normalizer.normalize(request);
    const scenario = this.mapper.map(normalized);
    const lookup = this.repository.lookup(scenario, normalized.hand_identity);
    if (!lookup) {
      return {
        status: "unsupported",
        scenario_key: scenario.scenario_key,
        normalized_hand: normalized.hand_identity,
        confidence: {
          dataset_match: "unsupported",
          hand_resolution: "hand_class",
          source: "strategy_pack_unavailable",
        },
        explanation: [
          "This action sequence is valid, but the current strategy pack does not contain a matching node for it.",
          "The runtime is returning an unsupported result instead of guessing an answer from a distant abstraction.",
        ],
        warnings: scenario.warnings,
        unsupported_reason: `No strategy pack entry was available for ${scenario.scenario_key}.`,
        nearest_supported_scenarios: this.repository.nearestSupportedScenarioKeys(scenario),
      };
    }
    const response = this.decisionService.select(normalized.mode, lookup, normalized.hand_identity);
    response.explanation = this.explanationService.build(normalized, scenario, response);
    return response;
  }
}
