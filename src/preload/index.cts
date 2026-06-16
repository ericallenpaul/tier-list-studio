import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("tierStudio", {
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>
  }
});
