import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { isAllowedDevServerUrl } from "./devServerUrl.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const getLoopbackDevServerUrl = () => {
  if (app.isPackaged || !process.env.VITE_DEV_SERVER_URL) {
    return undefined;
  }

  if (!isAllowedDevServerUrl(process.env.VITE_DEV_SERVER_URL)) {
    return undefined;
  }

  return new URL(process.env.VITE_DEV_SERVER_URL).toString();
};

export const createMainWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, "../../preload/index.cjs")
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const devServerUrl = getLoopbackDevServerUrl();

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(join(__dirname, "../../renderer/index.html"));
  }

  return window;
};
