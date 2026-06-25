import type { NativeBridge } from "./interface";
import { electronBridge } from "./electron";
import { tauriBridge } from "./tauri";
import { browserBridge } from "./browser";

export type {
  NativeBridge,
  OpenDialogOptions,
  SaveDialogOptions,
  ProjectMeta,
} from "./interface";

function detectBridge(): NativeBridge {
  if (typeof window === "undefined") {
    return browserBridge;
  }

  if (window.electronAPI) {
    return electronBridge;
  }

  if (window.__TAURI__) {
    return tauriBridge;
  }

  return browserBridge;
}

export const OpenBandNative: NativeBridge = detectBridge();
