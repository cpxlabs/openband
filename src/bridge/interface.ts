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
}
