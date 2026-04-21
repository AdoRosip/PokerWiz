import type { EvaluatePreflopRequest, PreflopEvaluationResult } from "./api";

declare global {
  interface Window {
    pokerwiz?: {
      evaluatePreflop(request: EvaluatePreflopRequest): Promise<PreflopEvaluationResult>;
    };
  }
}

export {};
