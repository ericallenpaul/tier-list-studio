import { app, BrowserWindow, ipcMain, Menu } from "electron";

import { registerHandlers } from "./ipc/registerHandlers.js";
import { createMainWindow } from "./windows/createMainWindow.js";

const testUserDataPath = process.env.TIER_LIST_STUDIO_USER_DATA;
const canUseTestUserDataPath = !app.isPackaged
  && (process.env.NODE_ENV === "test" || process.env.ELECTRON_DISABLE_SECURITY_WARNINGS === "true");

if (testUserDataPath && canUseTestUserDataPath) {
  app.setPath("userData", testUserDataPath);
}

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
