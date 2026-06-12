import { Platform } from 'react-native';
import type { Plugin, MixSnapshot, MetronomeSettings, RecordSettings, TrackDef, GroupDef } from './types';

export interface ProjectData {
  id: string;
  title: string;
  genre: string;
  key: string;
  bpm: number;
  tracks: TrackDef[];
  groups: GroupDef[];
  trackAssignments: Record<string, string | null>;
  masterPlugins: Plugin[];
  masteringChain: Plugin[];
  mixSnapshots: MixSnapshot[];
  activeMixId: string | undefined;
  metronome: MetronomeSettings;
  recordSettings: RecordSettings;
  lastSaved: number;
}

const STORAGE_PREFIX = 'openband_project_';
const INDEX_KEY = 'openband_project_index';

function getStorage(): Storage | null {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function saveProject(id: string, data: Omit<ProjectData, 'id' | 'lastSaved'>): void {
  const storage = getStorage();
  if (!storage) return;
  const project: ProjectData = { ...data, id, lastSaved: Date.now() };
  storage.setItem(STORAGE_PREFIX + id, JSON.stringify(project));
  const index = listProjectIndex();
  index[id] = { title: data.title, lastSaved: project.lastSaved };
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadProject(id: string): ProjectData | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectData;
  } catch {
    return null;
  }
}

export function deleteProject(id: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_PREFIX + id);
  const index = listProjectIndex();
  delete index[id];
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listProjectIndex(): Record<string, { title: string; lastSaved: number }> {
  const storage = getStorage();
  if (!storage) return {};
  const raw = storage.getItem(INDEX_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
