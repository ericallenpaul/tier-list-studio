import { app, BrowserWindow, ipcMain } from "electron";

import { createMainWindow } from "./windows/createMainWindow.js";

ipcMain.handle("app:getVersion", () => app.getVersion());

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
