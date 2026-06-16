import { contextBridge, ipcRenderer } from "electron";
import { createTierStudioApi } from "./api.cjs";

const tierStudioApi = createTierStudioApi((channel, payload) => ipcRenderer.invoke(channel, payload));

contextBridge.exposeInMainWorld("tierStudio", tierStudioApi);
