export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface ProjectMeta {
  id: string;
  name: string;
  lastModified: number;
}

export interface BridgeAudioDevice {
  id: string;
  kind: "audioinput" | "audiooutput";
  label: string;
  groupId: string;
  sampleRates: number[];
  channelCounts: number[];
  latency: number;
}

export interface BridgeHardwareChannel {
  deviceId: string;
  channelIndex: number;
  label: string;
  sampleRate: number;
}

export interface BridgePatchRoute {
  id: string;
  source: BridgeHardwareChannel;
  targetTrackId: string;
  targetChannel: number;
  gain: number;
  enabled: boolean;
}

export interface NativeBridge {
  showOpenDialog(options: OpenDialogOptions): Promise<string | null>;
  showSaveDialog(options: SaveDialogOptions): Promise<string | null>;
  readFile(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, data: ArrayBuffer | string): Promise<void>;
  getDocumentsPath(): Promise<string>;
  getAppDataPath(): Promise<string>;
  listProjects(): Promise<ProjectMeta[]>;
  saveProject(id: string, data: string): Promise<void>;
  loadProject(id: string): Promise<string | null>;
  deleteProject(id: string): Promise<void>;
  onMenuAction(callback: (action: string) => void): void;
  removeMenuActionListener(): void;
  enumerateAudioDevices(): Promise<{
    inputs: BridgeAudioDevice[];
    outputs: BridgeAudioDevice[];
  }>;
  openHardwareInput(
    deviceId: string,
    channelCount?: number,
    sampleRate?: number,
  ): Promise<boolean>;
  closeHardwareInput(): Promise<void>;
  createPatchRoute(route: BridgePatchRoute): Promise<void>;
  removePatchRoute(routeId: string): Promise<void>;
  getPatchRoutes(): Promise<BridgePatchRoute[]>;
  runVoiceCleaner?(input: string): Promise<string>;
}
