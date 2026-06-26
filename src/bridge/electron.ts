import type {
  NativeBridge,
  OpenDialogOptions,
  SaveDialogOptions,
  ProjectMeta,
} from "./interface";

const api: NativeBridge | null =
  typeof window !== "undefined"
    ? ((window as { electronAPI?: NativeBridge }).electronAPI ?? null)
    : null;

function requireAPI(): NativeBridge {
  if (!api) throw new Error("electronAPI not available");
  return api;
}

export const electronBridge: NativeBridge = {
  async showOpenDialog(options: OpenDialogOptions): Promise<string | null> {
    return requireAPI().showOpenDialog(options);
  },

  async showSaveDialog(options: SaveDialogOptions): Promise<string | null> {
    return requireAPI().showSaveDialog(options);
  },

  async readFile(path: string): Promise<ArrayBuffer> {
    return requireAPI().readFile(path);
  },

  async writeFile(path: string, data: ArrayBuffer | string): Promise<void> {
    return requireAPI().writeFile(path, data);
  },

  async getDocumentsPath(): Promise<string> {
    return requireAPI().getDocumentsPath();
  },

  async getAppDataPath(): Promise<string> {
    return requireAPI().getAppDataPath();
  },

  async listProjects(): Promise<ProjectMeta[]> {
    return requireAPI().listProjects();
  },

  async saveProject(id: string, data: string): Promise<void> {
    return requireAPI().saveProject(id, data);
  },

  async loadProject(id: string): Promise<string | null> {
    return requireAPI().loadProject(id);
  },

  async deleteProject(id: string): Promise<void> {
    return requireAPI().deleteProject(id);
  },

  onMenuAction(callback: (action: string) => void): void {
    requireAPI().onMenuAction(callback);
  },

  removeMenuActionListener(): void {
    requireAPI().removeMenuActionListener();
  },
};
