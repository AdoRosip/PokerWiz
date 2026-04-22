import path from "node:path";

import { app, BrowserWindow, ipcMain } from "electron";

import type { EvaluatePreflopRequest, PreflopEvaluationResult, PreflopPackSummary } from "../shared/contracts";
import { PreflopAnalysisService } from "../packages/app-services/preflop-analysis-service";

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  const preflopAnalysisService = await PreflopAnalysisService.fromFile(
    path.join(app.getAppPath(), "data", "dev", "strategy-pack.v1.json"),
  );

  ipcMain.removeHandler("preflop:evaluate");
  ipcMain.handle("preflop:evaluate", async (_event, request: EvaluatePreflopRequest): Promise<PreflopEvaluationResult> => {
    return preflopAnalysisService.evaluate(request);
  });
  ipcMain.removeHandler("preflop:summary");
  ipcMain.handle("preflop:summary", async (): Promise<PreflopPackSummary> => {
    return preflopAnalysisService.summary();
  });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#0b1218",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const rendererUrl = process.env.POKERWIZ_RENDERER_URL;
  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), "desktop-ui", "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
