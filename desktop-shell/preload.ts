import { contextBridge, ipcRenderer } from "electron";

import type { EvaluatePreflopRequest, PreflopEvaluationResult, PreflopPackSummary } from "../shared/contracts";

contextBridge.exposeInMainWorld("pokerwiz", {
  evaluatePreflop: (request: EvaluatePreflopRequest): Promise<PreflopEvaluationResult> =>
    ipcRenderer.invoke("preflop:evaluate", request),
  getPreflopSummary: (): Promise<PreflopPackSummary> => ipcRenderer.invoke("preflop:summary"),
});
