import type { NativeBridge, OpenDialogOptions, SaveDialogOptions, ProjectMeta } from './interface';

function getAPI(): NativeBridge | null {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI as NativeBridge;
  }
  return null;
}

export const electronBridge: NativeBridge = {
  async showOpenDialog(options: OpenDialogOptions): Promise<string | null> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.showOpenDialog(options);
  },

  async showSaveDialog(options: SaveDialogOptions): Promise<string | null> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.showSaveDialog(options);
  },

  async readFile(path: string): Promise<ArrayBuffer> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.readFile(path);
  },

  async writeFile(path: string, data: ArrayBuffer | string): Promise<void> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.writeFile(path, data);
  },

  async getDocumentsPath(): Promise<string> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.getDocumentsPath();
  },

  async getAppDataPath(): Promise<string> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.getAppDataPath();
  },

  async listProjects(): Promise<ProjectMeta[]> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.listProjects();
  },

  async saveProject(id: string, data: string): Promise<void> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.saveProject(id, data);
  },

  async loadProject(id: string): Promise<string | null> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.loadProject(id);
  },

  async deleteProject(id: string): Promise<void> {
    const api = getAPI();
    if (!api) throw new Error('electronAPI not available');
    return api.deleteProject(id);
  },
};
