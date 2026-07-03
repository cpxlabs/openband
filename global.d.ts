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

interface MIDIInputMap extends Map<string, MIDIInput> {}
interface MIDIOutputMap extends Map<string, MIDIOutput> {}

interface MIDIAccess {
  inputs: MIDIInputMap;
  outputs: MIDIOutputMap;
  sysexEnabled: boolean;
  onstatechange: ((this: MIDIAccess, ev: Event) => void) | null;
}

interface MIDIInput extends EventTarget {
  id: string;
  name: string;
  manufacturer: string;
  state: "disconnected" | "connected";
  connection: "open" | "closed" | "pending";
  onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => void) | null;
}

interface WebMidiMessageEvent extends Event {
  data: Uint8Array;
  receivedTime: number;
}

interface Navigator {
  requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<MIDIAccess>;
}

interface Window {
  electronAPI?: ElectronAPI;
  __TAURI__?: unknown;
}
