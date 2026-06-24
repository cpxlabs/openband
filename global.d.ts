declare module "*.css";

interface ElectronAPI {
  showOpenDialog(options: any): Promise<string | null>;
  showSaveDialog(options: any): Promise<string | null>;
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
}
