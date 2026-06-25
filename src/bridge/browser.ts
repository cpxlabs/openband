import type {
  NativeBridge,
  OpenDialogOptions,
  SaveDialogOptions,
  ProjectMeta,
} from "./interface";

function createBlobDownload(
  data: ArrayBuffer | string,
  filename: string,
): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const MAX_UPLOAD_CACHE = 10;
const uploadCache = new Map<string, ArrayBuffer>();
let uploadCounter = 0;

function createFileUpload(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        if (!buf) {
          resolve(null);
          return;
        }
        const key = `_upload_${++uploadCounter}_${file.name}`;
        uploadCache.set(key, buf);
        if (uploadCache.size > MAX_UPLOAD_CACHE) {
          const first = uploadCache.keys().next().value;
          if (first !== undefined) uploadCache.delete(first);
        }
        resolve(key);
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}

export const browserBridge: NativeBridge = {
  async showOpenDialog(options: OpenDialogOptions): Promise<string | null> {
    const accept =
      options.filters
        ?.map((f) => f.extensions.map((e) => `.${e}`).join(","))
        .join(",") ?? "*";
    return createFileUpload(accept);
  },

  async showSaveDialog(options: SaveDialogOptions): Promise<string | null> {
    return options.defaultPath ?? "untitled";
  },

  async readFile(path: string): Promise<ArrayBuffer> {
    const cached = uploadCache.get(path);
    if (cached) return cached.slice(0);
    console.warn("[Browser bridge] readFile: path not found in upload cache");
    throw new Error("File not found in browser upload cache");
  },

  async writeFile(path: string, data: ArrayBuffer | string): Promise<void> {
    createBlobDownload(data, path.split("/").pop() ?? "download");
  },

  async getDocumentsPath(): Promise<string> {
    return "/downloads";
  },

  async getAppDataPath(): Promise<string> {
    return "/appdata";
  },

  async listProjects(): Promise<ProjectMeta[]> {
    const raw = localStorage.getItem("openband_project_index");
    if (!raw) return [];
    try {
      const index = JSON.parse(raw) as Record<
        string,
        { title: string; lastSaved: number }
      >;
      return Object.entries(index).map(([id, meta]) => ({
        id,
        name: meta.title,
        lastModified: meta.lastSaved,
      }));
    } catch (e) {
      console.warn("[bridge] listProjects parse failed:", e);
      return [];
    }
  },

  async saveProject(id: string, data: string): Promise<void> {
    localStorage.setItem(`openband_project_${id}`, data);
    try {
      const raw = localStorage.getItem("openband_project_index");
      const index = raw ? JSON.parse(raw) : {};
      index[id] = { title: "Project", lastSaved: Date.now() };
      localStorage.setItem("openband_project_index", JSON.stringify(index));
    } catch (e) {
      console.warn("Bridge saveProject index update failed:", e);
    }
  },

  async loadProject(id: string): Promise<string | null> {
    return localStorage.getItem(`openband_project_${id}`);
  },

  async deleteProject(id: string): Promise<void> {
    localStorage.removeItem(`openband_project_${id}`);
    try {
      const raw = localStorage.getItem("openband_project_index");
      if (raw) {
        const index = JSON.parse(raw);
        delete index[id];
        localStorage.setItem("openband_project_index", JSON.stringify(index));
      }
    } catch (e) {
      console.warn("Bridge deleteProject index update failed:", e);
    }
  },

  onMenuAction(_callback: (action: string) => void): void {},

  removeMenuActionListener(): void {},
};
