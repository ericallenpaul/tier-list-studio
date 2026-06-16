/// <reference types="vite/client" />

interface TierStudioApi {
  app: {
    getVersion: () => Promise<string>;
  };
}

interface Window {
  tierStudio: TierStudioApi;
}
