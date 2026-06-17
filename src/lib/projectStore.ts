import { Platform } from 'react-native';
import type { Plugin, MixSnapshot, MetronomeSettings, RecordSettings, TrackDef, GroupDef, SendBus, TrackAmpChain } from './types';

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
  sendBuses: SendBus[];
  trackAmpChains: Record<string, TrackAmpChain>;
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
  try {
    const project: ProjectData = { ...data, id, lastSaved: Date.now() };
    storage.setItem(STORAGE_PREFIX + id, JSON.stringify(project));
    const index = listProjectIndex();
    index[id] = { title: data.title, lastSaved: project.lastSaved };
    storage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
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

export function exportProject(id: string): string | null {
  const project = loadProject(id);
  if (!project) return null;
  return JSON.stringify(project, null, 2);
}

function sanitizeProjectData(raw: unknown): ProjectData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== 'string' && data.id !== undefined) return null;
  if (typeof data.title !== 'string') return null;
  if (typeof data.bpm !== 'number') return null;
  return {
    id: data.id as string || `import-${Date.now()}`,
    title: data.title as string,
    genre: typeof data.genre === 'string' ? data.genre : '',
    key: typeof data.key === 'string' ? data.key : 'C',
    bpm: data.bpm as number,
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    trackAssignments: typeof data.trackAssignments === 'object' && data.trackAssignments !== null
      ? (data.trackAssignments as Record<string, string | null>)
      : {},
    masterPlugins: Array.isArray(data.masterPlugins) ? data.masterPlugins : [],
    masteringChain: Array.isArray(data.masteringChain) ? data.masteringChain : [],
    sendBuses: Array.isArray(data.sendBuses) ? data.sendBuses : [],
    trackAmpChains: typeof data.trackAmpChains === 'object' && data.trackAmpChains !== null
      ? (data.trackAmpChains as Record<string, TrackAmpChain>)
      : {},
    mixSnapshots: Array.isArray(data.mixSnapshots) ? data.mixSnapshots : [],
    activeMixId: typeof data.activeMixId === 'string' ? data.activeMixId : undefined,
    metronome: typeof data.metronome === 'object' && data.metronome !== null
      ? (data.metronome as ProjectData['metronome'])
      : { bpm: 120, timeSig: [4, 4] as [number, number], accentInterval: 4, volume: 0.5, enabled: false, countIn: false, countInBars: 2 },
    recordSettings: typeof data.recordSettings === 'object' && data.recordSettings !== null
      ? (data.recordSettings as ProjectData['recordSettings'])
      : { armed: false, inputSource: 'mic', quality: 'high', sampleRate: 44100, mono: false, preRoll: 0 },
    lastSaved: typeof data.lastSaved === 'number' ? data.lastSaved : Date.now(),
  };
}

export function importProject(json: string): string | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') {
      delete parsed.__proto__;
      delete parsed.constructor;
    }
    const data = sanitizeProjectData(parsed);
    if (!data) return null;
    saveProject(data.id, data);
    return data.id;
  } catch {
    return null;
  }
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
