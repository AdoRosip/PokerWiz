import type { EvaluatePreflopRequest, PreflopEvaluationResult, PreflopPackSummary } from "../../shared/contracts";
import { PreflopEngine } from "../preflop-engine/preflop-engine";

export class PreflopAnalysisService {
  constructor(private readonly engine: PreflopEngine) {}

  static async fromFile(path: string): Promise<PreflopAnalysisService> {
    const engine = await PreflopEngine.fromFile(path);
    return new PreflopAnalysisService(engine);
  }

  evaluate(request: EvaluatePreflopRequest): PreflopEvaluationResult {
    return this.engine.evaluate(request);
  }

  summary(): PreflopPackSummary {
    return this.engine.summary();
  }
}
