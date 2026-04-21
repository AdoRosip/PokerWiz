import { contextBridge, ipcRenderer } from "electron";

import type { EvaluatePreflopRequest, EvaluatePreflopResponse } from "../shared/contracts";

contextBridge.exposeInMainWorld("pokerwiz", {
  evaluatePreflop: (request: EvaluatePreflopRequest): Promise<EvaluatePreflopResponse> =>
    ipcRenderer.invoke("preflop:evaluate", request),
});
