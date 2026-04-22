import type { EvaluatePreflopRequest, PreflopEvaluationResult, PreflopPackSummary } from "../types/api";

export async function evaluatePreflop(
  request: EvaluatePreflopRequest,
): Promise<PreflopEvaluationResult> {
  if (!window.pokerwiz?.evaluatePreflop) {
    throw new Error("Electron bridge unavailable. Start the app with `npm run dev` from the repo root.");
  }
  return window.pokerwiz.evaluatePreflop(request);
}

export async function getPreflopSummary(): Promise<PreflopPackSummary> {
  if (!window.pokerwiz?.getPreflopSummary) {
    throw new Error("Electron bridge unavailable. Start the app with `npm run dev` from the repo root.");
  }
  return window.pokerwiz.getPreflopSummary();
}
