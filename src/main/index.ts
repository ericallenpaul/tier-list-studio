import { app, BrowserWindow, ipcMain, Menu } from "electron";

import { registerHandlers } from "./ipc/registerHandlers.js";
import { createMainWindow } from "./windows/createMainWindow.js";

registerHandlers(ipcMain, app);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
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
