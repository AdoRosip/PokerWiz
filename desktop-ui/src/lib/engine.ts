import type { EvaluatePreflopRequest, PreflopEvaluationResult } from "../types/api";

export async function evaluatePreflop(
  request: EvaluatePreflopRequest,
): Promise<PreflopEvaluationResult> {
  if (!window.pokerwiz?.evaluatePreflop) {
    throw new Error("Electron bridge unavailable. Start the app with `npm run dev` from the repo root.");
  }
  return window.pokerwiz.evaluatePreflop(request);
}
