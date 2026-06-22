import type { NativeBridge, OpenDialogOptions, SaveDialogOptions, ProjectMeta } from './interface';

export const tauriBridge: NativeBridge = {
  async showOpenDialog(_options: OpenDialogOptions): Promise<string | null> {
    console.warn('[Tauri stub] showOpenDialog not yet implemented');
    return null;
  },

  async showSaveDialog(_options: SaveDialogOptions): Promise<string | null> {
    console.warn('[Tauri stub] showSaveDialog not yet implemented');
    return null;
  },

  async readFile(_path: string): Promise<ArrayBuffer> {
    console.warn('[Tauri stub] readFile not yet implemented');
    throw new Error('Tauri bridge not implemented');
  },

  async writeFile(_path: string, _data: ArrayBuffer | string): Promise<void> {
    console.warn('[Tauri stub] writeFile not yet implemented');
  },

  async getDocumentsPath(): Promise<string> {
    console.warn('[Tauri stub] getDocumentsPath not yet implemented');
    return '/mock/documents';
  },

  async getAppDataPath(): Promise<string> {
    console.warn('[Tauri stub] getAppDataPath not yet implemented');
    return '/mock/appdata';
  },

  async listProjects(): Promise<ProjectMeta[]> {
    console.warn('[Tauri stub] listProjects not yet implemented');
    return [];
  },

  async saveProject(_id: string, _data: string): Promise<void> {
    console.warn('[Tauri stub] saveProject not yet implemented');
  },

  async loadProject(_id: string): Promise<string | null> {
    console.warn('[Tauri stub] loadProject not yet implemented');
    return null;
  },

  async deleteProject(_id: string): Promise<void> {
    console.warn('[Tauri stub] deleteProject not yet implemented');
  },

  onMenuAction(_callback: (action: string) => void): void {
    console.warn('[Tauri stub] onMenuAction not yet implemented');
  },

  removeMenuActionListener(): void {
    console.warn('[Tauri stub] removeMenuActionListener not yet implemented');
  },
};
