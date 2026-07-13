import type {
  NativeBridge,
  OpenDialogOptions,
  SaveDialogOptions,
  ProjectMeta,
  BridgeAudioDevice,
  BridgePatchRoute,
} from "./interface";

let stubWarned = false;
function warnStub(_method: string) {
  if (!stubWarned) {
    console.warn("[Tauri stub] Tauri bridge not available. Using browser fallback.");
    stubWarned = true;
  }
}

export const tauriBridge: NativeBridge = {
  async showOpenDialog(_options: OpenDialogOptions): Promise<string | null> {
    warnStub("showOpenDialog");
    return null;
  },

  async showSaveDialog(_options: SaveDialogOptions): Promise<string | null> {
    warnStub("showSaveDialog");
    return null;
  },

  async readFile(_path: string): Promise<ArrayBuffer> {
    warnStub("readFile");
    throw new Error("Tauri bridge not implemented");
  },

  async writeFile(_path: string, _data: ArrayBuffer | string): Promise<void> {
    warnStub("writeFile");
  },

  async getDocumentsPath(): Promise<string> {
    warnStub("getDocumentsPath");
    return "/mock/documents";
  },

  async getAppDataPath(): Promise<string> {
    warnStub("getAppDataPath");
    return "/mock/appdata";
  },

  async listProjects(): Promise<ProjectMeta[]> {
    warnStub("listProjects");
    return [];
  },

  async saveProject(_id: string, _data: string): Promise<void> {
    warnStub("saveProject");
  },

  async loadProject(_id: string): Promise<string | null> {
    warnStub("loadProject");
    return null;
  },

  async deleteProject(_id: string): Promise<void> {
    warnStub("deleteProject");
  },

  onMenuAction(_callback: (action: string) => void): void {
    warnStub("onMenuAction");
  },

  removeMenuActionListener(): void {
    warnStub("removeMenuActionListener");
  },

  async enumerateAudioDevices(): Promise<{
    inputs: BridgeAudioDevice[];
    outputs: BridgeAudioDevice[];
  }> {
    warnStub("enumerateAudioDevices");
    return { inputs: [], outputs: [] };
  },

  async openHardwareInput(
    _deviceId: string,
    _channelCount?: number,
    _sampleRate?: number,
  ): Promise<boolean> {
    warnStub("openHardwareInput");
    return false;
  },

  async closeHardwareInput(): Promise<void> {
    warnStub("closeHardwareInput");
  },

  async createPatchRoute(_route: BridgePatchRoute): Promise<void> {
    warnStub("createPatchRoute");
  },

  async removePatchRoute(_routeId: string): Promise<void> {
    warnStub("removePatchRoute");
  },

  async getPatchRoutes(): Promise<BridgePatchRoute[]> {
    warnStub("getPatchRoutes");
    return [];
  },

  async runVoiceCleaner(_input: string): Promise<string> {
    warnStub("runVoiceCleaner");
    return _input;
  },
};
