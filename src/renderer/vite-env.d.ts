/// <reference types="vite/client" />

import type { TierStudioApi } from "../shared/contracts/tierStudioApi";

declare global {
  interface Window {
    tierStudio: TierStudioApi;
  }
}
