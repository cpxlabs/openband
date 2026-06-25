declare module "*.css";

interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface ElectronAPI {
  showOpenDialog(options: OpenDialogOptions): Promise<string | null>;
  showSaveDialog(options: SaveDialogOptions): Promise<string | null>;
  readFile(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, data: ArrayBuffer | string): Promise<void>;
  getDocumentsPath(): Promise<string>;
  getAppDataPath(): Promise<string>;
  listProjects(): Promise<{ id: string; name: string; lastModified: number }[]>;
  saveProject(id: string, data: string): Promise<void>;
  loadProject(id: string): Promise<string | null>;
  deleteProject(id: string): Promise<void>;
  onMenuAction(callback: (action: string) => void): void;
  removeMenuActionListener(): void;
}

interface Window {
  electronAPI?: ElectronAPI;
  __TAURI__?: unknown;
}
