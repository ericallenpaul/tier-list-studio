import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const isLoopbackHostname = (hostname: string) => {
  return hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || hostname.startsWith("127.");
};

const getLoopbackDevServerUrl = () => {
  if (app.isPackaged || !process.env.VITE_DEV_SERVER_URL) {
    return undefined;
  }

  let devServerUrl: URL;

  try {
    devServerUrl = new URL(process.env.VITE_DEV_SERVER_URL);
  } catch {
    return undefined;
  }

  if (!["http:", "https:"].includes(devServerUrl.protocol) || !isLoopbackHostname(devServerUrl.hostname)) {
    return undefined;
  }

  return devServerUrl.toString();
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

  const devServerUrl = getLoopbackDevServerUrl();

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(join(__dirname, "../../renderer/index.html"));
  }

  return window;
};
