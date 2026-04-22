import type { EvaluatePreflopRequest, PreflopEvaluationResult, PreflopPackSummary } from "./api";

declare global {
  interface Window {
    pokerwiz?: {
      evaluatePreflop(request: EvaluatePreflopRequest): Promise<PreflopEvaluationResult>;
      getPreflopSummary(): Promise<PreflopPackSummary>;
    };
  }
}

export {};
