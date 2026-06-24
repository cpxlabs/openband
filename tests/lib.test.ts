import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { midiNoteToName } from '../src/lib/midiSynth';
import { GENRES, MUSICAL_KEYS, keyLabel, generateTracksForGenre } from '../src/lib/projectTemplates';
import { MASTERING_CHAIN_PRESETS, buildMasteringChain, getOversampleLabel } from '../src/lib/mastering';
import { MASTERING_PLUGIN_DEFS, buildMasteringChain as buildSuiteChain, createVersion, formatFileSize, formatSampleRate } from '../src/lib/masteringSuite';

const mockAudioCtx = {
  createOscillator: vi.fn(() => ({
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  })),
  createGain: vi.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    Q: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createStereoPanner: vi.fn(() => ({ pan: { value: 0 }, connect: vi.fn() })),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  resume: vi.fn(),
  close: vi.fn(),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
};
vi.stubGlobal('AudioContext', vi.fn(function() { return mockAudioCtx; }));
vi.stubGlobal('OfflineAudioContext', vi.fn(() => ({
  startRendering: vi.fn(),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  })),
  createStereoPanner: vi.fn(() => ({ pan: { value: 0 }, connect: vi.fn() })),
  destination: {},
  sampleRate: 48000,
  length: 0,
})));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('responsive.ts - breakpoint logic', () => {
  function getBreakpoint(width: number): string {
    if (width < 480) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  function getContentPadding(width: number): number {
    if (width < 480) return 12;
    if (width < 1024) return 20;
    return 32;
  }

  function getChannelWidth(width: number): number {
    if (width < 480) return 96;
    if (width < 1024) return 112;
    return 136;
  }

  function getTracksSidebarWidth(width: number): number {
    if (width < 480) return 100;
    if (width < 1024) return 144;
    return 180;
  }

  function getToolbarFontSize(width: number): number {
    if (width < 480) return 10;
    if (width < 1024) return 12;
    return 14;
  }

  it('returns mobile below 480px', () => {
    expect(getBreakpoint(0)).toBe('mobile');
    expect(getBreakpoint(320)).toBe('mobile');
    expect(getBreakpoint(479)).toBe('mobile');
  });

  it('returns tablet between 480px and 1023px', () => {
    expect(getBreakpoint(480)).toBe('tablet');
    expect(getBreakpoint(768)).toBe('tablet');
    expect(getBreakpoint(1023)).toBe('tablet');
  });

  it('returns desktop at or above 1024px', () => {
    expect(getBreakpoint(1024)).toBe('desktop');
    expect(getBreakpoint(1440)).toBe('desktop');
    expect(getBreakpoint(1920)).toBe('desktop');
  });

  it('contentPadding varies by breakpoint', () => {
    expect(getContentPadding(320)).toBe(12);
    expect(getContentPadding(768)).toBe(20);
    expect(getContentPadding(1440)).toBe(32);
  });

  it('channelWidth varies by breakpoint', () => {
    expect(getChannelWidth(320)).toBe(96);
    expect(getChannelWidth(600)).toBe(112);
    expect(getChannelWidth(1440)).toBe(136);
  });

  it('tracksSidebarWidth varies by breakpoint', () => {
    expect(getTracksSidebarWidth(320)).toBe(100);
    expect(getTracksSidebarWidth(600)).toBe(144);
    expect(getTracksSidebarWidth(1440)).toBe(180);
  });

  it('toolbarFontSize varies by breakpoint', () => {
    expect(getToolbarFontSize(320)).toBe(10);
    expect(getToolbarFontSize(600)).toBe(12);
    expect(getToolbarFontSize(1440)).toBe(14);
  });

  it('handles edge case widths', () => {
    expect(getBreakpoint(0)).toBe('mobile');
    expect(getBreakpoint(480)).toBe('tablet');
    expect(getBreakpoint(1024)).toBe('desktop');
    expect(getContentPadding(0)).toBe(12);
    expect(getContentPadding(1)).toBe(12);
  });
});

describe('projectStore.ts', () => {
  const mockProject = {
    title: 'Test Project',
    genre: 'pop',
    key: 'C',
    bpm: 120,
    tracks: [],
    groups: [],
    trackAssignments: {},
    masterPlugins: [],
    masteringChain: [],
    sendBuses: [],
    trackAmpChains: {},
    mixSnapshots: [],
    activeMixId: undefined,
    metronome: { bpm: 120, timeSig: [4, 4] as [number, number], accentInterval: 4, volume: 80, enabled: false, countIn: false, countInBars: 2 },
    recordSettings: { armed: false, inputSource: 'mic' as const, quality: 'high' as const, sampleRate: 44100 as const, mono: false, preRoll: 0 },
  };

  it('saveProject stores to localStorage', async () => {
    const { saveProject, loadProject } = await import('../src/lib/projectStore');
    saveProject('proj-1', mockProject);
    const loaded = loadProject('proj-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe('Test Project');
    expect(loaded!.id).toBe('proj-1');
    expect(loaded!.lastSaved).toBeGreaterThan(0);
  });

  it('loadProject returns null for non-existent', async () => {
    const { loadProject } = await import('../src/lib/projectStore');
    expect(loadProject('nonexistent')).toBeNull();
  });

  it('listProjectIndex returns stored projects', async () => {
    const { saveProject, listProjectIndex } = await import('../src/lib/projectStore');
    saveProject('proj-1', mockProject);
    saveProject('proj-2', { ...mockProject, title: 'Second' });
    const index = listProjectIndex();
    expect(Object.keys(index)).toHaveLength(2);
    expect(index['proj-1'].title).toBe('Test Project');
    expect(index['proj-2'].title).toBe('Second');
  });

  it('listProjectIndex returns empty object when no projects', async () => {
    const { listProjectIndex } = await import('../src/lib/projectStore');
    expect(listProjectIndex()).toEqual({});
  });

  it('exportProject returns JSON string', async () => {
    const { saveProject, exportProject } = await import('../src/lib/projectStore');
    saveProject('proj-1', mockProject);
    const json = exportProject('proj-1');
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!);
    expect(parsed.title).toBe('Test Project');
  });

  it('exportProject returns null for non-existent', async () => {
    const { exportProject } = await import('../src/lib/projectStore');
    expect(exportProject('nonexistent')).toBeNull();
  });

  it('importProject parses valid JSON and saves', async () => {
    const { importProject, loadProject } = await import('../src/lib/projectStore');
    const json = JSON.stringify({
      id: 'imported-1', title: 'Imported', bpm: 100, genre: 'rock', key: 'E',
      tracks: [], groups: [], trackAssignments: {}, masterPlugins: [],
      masteringChain: [], sendBuses: [], trackAmpChains: {}, mixSnapshots: [],
      metronome: { bpm: 120, timeSig: [4, 4], accentInterval: 4, volume: 80, enabled: false, countIn: false, countInBars: 2 },
      recordSettings: { armed: false, inputSource: 'mic', quality: 'high', sampleRate: 44100, mono: false, preRoll: 0 },
    });
    const id = importProject(json);
    expect(id).toBe('imported-1');
    const loaded = loadProject('imported-1');
    expect(loaded!.title).toBe('Imported');
  });

  it('importProject returns null for invalid JSON', async () => {
    const { importProject } = await import('../src/lib/projectStore');
    expect(importProject('not json')).toBeNull();
  });

  it('sanitizeProjectData handles null', async () => {
    const { importProject } = await import('../src/lib/projectStore');
    expect(importProject('null')).toBeNull();
  });

  it('deleteProject removes from storage', async () => {
    const { saveProject, loadProject, deleteProject } = await import('../src/lib/projectStore');
    saveProject('proj-1', mockProject);
    expect(loadProject('proj-1')).not.toBeNull();
    deleteProject('proj-1');
    expect(loadProject('proj-1')).toBeNull();
  });

  it('sanitizeProjectData fills missing fields', async () => {
    const { importProject } = await import('../src/lib/projectStore');
    const minimal = JSON.stringify({ title: 'Minimal', bpm: 100 });
    const id = importProject(minimal);
    expect(id).toBeTruthy();
  });
});

describe('midiSynth.ts', () => {
  it('midiNoteToName returns correct note names', () => {
    expect(midiNoteToName(60)).toBe('C4');
    expect(midiNoteToName(61)).toBe('C#4');
    expect(midiNoteToName(69)).toBe('A4');
    expect(midiNoteToName(48)).toBe('C3');
    expect(midiNoteToName(0)).toBe('C-1');
    expect(midiNoteToName(127)).toBe('G9');
  });

  it('playNote creates oscillator and returns id', async () => {
    const { playNote } = await import('../src/lib/midiSynth');
    const id = playNote(60, 100, 'sine', 8000, 0);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
  });

  it('stopNote does not throw for invalid id', async () => {
    const { stopNote } = await import('../src/lib/midiSynth');
    expect(() => stopNote('invalid')).not.toThrow();
  });

  it('stopAllNotes does not throw when no voices', async () => {
    const { stopAllNotes } = await import('../src/lib/midiSynth');
    expect(() => stopAllNotes()).not.toThrow();
  });

  it('disposeAudioContext closes context', async () => {
    const { disposeAudioContext } = await import('../src/lib/midiSynth');
    disposeAudioContext();
    expect(mockAudioCtx.close).toHaveBeenCalled();
  });

  it('playMidiNotes returns array of ids', async () => {
    const { playMidiNotes } = await import('../src/lib/midiSynth');
    const notes = [{ pitch: 60, start: 1, duration: 1, velocity: 100 }];
    const ids = playMidiNotes(notes, 120, 0, 'sawtooth');
    expect(Array.isArray(ids)).toBe(true);
  });
});

describe('projectTemplates.ts', () => {
  it('GENRES has exactly 10 genres', () => {
    expect(GENRES).toHaveLength(10);
  });

  it('GENRES includes expected genres', () => {
    const names = GENRES.map(g => g.name);
    expect(names).toContain('Pop');
    expect(names).toContain('Rock');
    expect(names).toContain('Lo-Fi');
    expect(names).toContain('Metal');
  });

  it('each genre has required fields', () => {
    for (const g of GENRES) {
      expect(g.id).toBeTruthy();
      expect(g.name).toBeTruthy();
      expect(g.icon).toBeTruthy();
      expect(typeof g.defaultBpm).toBe('number');
      expect(Array.isArray(g.bpmRange)).toBe(true);
      expect(g.bpmRange).toHaveLength(2);
      expect(g.defaultKey).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(Array.isArray(g.suggestedTracks)).toBe(true);
    }
  });

  it('MUSICAL_KEYS has 24 keys', () => {
    expect(MUSICAL_KEYS).toHaveLength(24);
    expect(MUSICAL_KEYS).toContain('C');
    expect(MUSICAL_KEYS).toContain('Cm');
    expect(MUSICAL_KEYS).toContain('F#');
    expect(MUSICAL_KEYS).toContain('A#m');
  });

  it('keyLabel returns the key label', () => {
    expect(keyLabel('C')).toBe('C');
    expect(keyLabel('Cm')).toBe('Cm');
    expect(keyLabel('F#m')).toBe('F#m');
    expect(keyLabel('Bb')).toBe('Bb');
  });

  it('keyLabel returns original for non-m keys', () => {
    expect(keyLabel('G')).toBe('G');
    expect(keyLabel('D#')).toBe('D#');
  });
});

describe('generateTracksForGenre', () => {
  it('returns tracks matching suggestedTracks count for each genre', () => {
    for (const genre of GENRES) {
      const tracks = generateTracksForGenre(genre.id);
      expect(tracks).toHaveLength(genre.suggestedTracks.length);
    }
  });

  it('each track has valid TrackDef fields', () => {
    const tracks = generateTracksForGenre('rock');
    for (const t of tracks) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.color).toMatch(/^bg-/);
      expect(typeof t.muted).toBe('boolean');
      expect(typeof t.solo).toBe('boolean');
      expect(t.volume).toBeGreaterThanOrEqual(0);
      expect(t.volume).toBeLessThanOrEqual(100);
      expect(t.pan).toBeGreaterThanOrEqual(-100);
      expect(t.pan).toBeLessThanOrEqual(100);
      expect(Array.isArray(t.regions)).toBe(true);
      expect(Array.isArray(t.plugins)).toBe(true);
    }
  });

  it('each track has at least one region with positive duration', () => {
    const tracks = generateTracksForGenre('edm');
    for (const t of tracks) {
      expect(t.regions.length).toBeGreaterThan(0);
      for (const r of t.regions) {
        expect(r.start).toBeGreaterThanOrEqual(0);
        expect(r.duration).toBeGreaterThan(0);
        expect(r.id).toBeTruthy();
      }
    }
  });

  it('tracks have sequential string IDs', () => {
    const tracks = generateTracksForGenre('hiphop');
    tracks.forEach((t, i) => {
      expect(t.id).toBe(String(i + 1));
    });
  });

  it('track names match suggestedTracks from the genre template', () => {
    const genre = GENRES.find(g => g.id === 'jazz')!;
    const tracks = generateTracksForGenre('jazz');
    tracks.forEach((t, i) => {
      expect(t.name).toBe(genre.suggestedTracks[i].name);
    });
  });

  it('track colors match suggestedTracks from the genre template', () => {
    const genre = GENRES.find(g => g.id === 'metal')!;
    const tracks = generateTracksForGenre('metal');
    tracks.forEach((t, i) => {
      expect(t.color).toBe(genre.suggestedTracks[i].color);
    });
  });

  it('returns fallback tracks for unknown genre', () => {
    const tracks = generateTracksForGenre('nonexistent');
    expect(tracks).toHaveLength(4);
    expect(tracks[0].name).toBe('Vocal');
    expect(tracks[1].name).toBe('Instrumento');
    expect(tracks[2].name).toBe('Bateria');
    expect(tracks[3].name).toBe('Baixo');
  });

  it('returns fallback tracks for empty string genre', () => {
    const tracks = generateTracksForGenre('');
    expect(tracks).toHaveLength(4);
  });

  it('all tracks start unmuted and unsoloed', () => {
    const tracks = generateTracksForGenre('pop');
    for (const t of tracks) {
      expect(t.muted).toBe(false);
      expect(t.solo).toBe(false);
    }
  });

  it('all tracks have empty plugins and automation', () => {
    const tracks = generateTracksForGenre('lofi');
    for (const t of tracks) {
      expect(t.plugins).toHaveLength(0);
      expect(Object.keys(t.automation)).toHaveLength(0);
    }
  });

  it('all 10 genres produce tracks', () => {
    for (const genre of GENRES) {
      const tracks = generateTracksForGenre(genre.id);
      expect(tracks.length).toBeGreaterThan(0);
    }
  });

  it('bpm parameter affects region duration', () => {
    const fast = generateTracksForGenre('pop', 200);
    const slow = generateTracksForGenre('pop', 60);
    for (let i = 0; i < fast.length; i++) {
      expect(fast[i].regions[0].duration).toBeLessThan(slow[i].regions[0].duration);
    }
  });

  it('returns empty regions list for genres with no suggestedTracks', () => {
    const tracks = generateTracksForGenre('');
    expect(tracks.length).toBeGreaterThan(0);
  });

  it('generates MIDI notes for melodic tracks with key parameter', () => {
    const tracks = generateTracksForGenre('edm', 128, 'C');
    const melodicTracks = tracks.filter(t => t.midiNotes && t.midiNotes.length > 0);
    expect(melodicTracks.length).toBeGreaterThan(0);
    for (const t of melodicTracks) {
      expect(t.midiNotes!.length).toBeGreaterThan(0);
      for (const n of t.midiNotes!) {
        expect(n.pitch).toBeGreaterThanOrEqual(0);
        expect(n.pitch).toBeLessThanOrEqual(127);
        expect(n.duration).toBeGreaterThan(0);
        expect(n.velocity).toBeGreaterThan(0);
      }
    }
  });

  it('different keys produce different MIDI pitches on same track type', () => {
    const cMajor = generateTracksForGenre('edm', 128, 'C');
    const fSharp = generateTracksForGenre('edm', 128, 'F#');
    const bassC = cMajor.find(t => t.midiNotes && t.midiNotes.length > 0)!;
    const bassF = fSharp.find(t => t.midiNotes && t.midiNotes.length > 0)!;
    expect(bassC.midiNotes![0].pitch).not.toBe(bassF.midiNotes![0].pitch);
  });

  it('percussion/drums tracks do not get MIDI notes', () => {
    const tracks = generateTracksForGenre('rock', 120, 'E');
    for (const t of tracks) {
      if (t.name.toLowerCase().includes('bateria') || t.name.includes('Drums') || t.name.includes('Percussão')) {
        expect(t.midiNotes).toBeUndefined();
      }
    }
  });

  it('Baixo tracks get MIDI notes one octave below root', () => {
    const tracks = generateTracksForGenre('pop', 120, 'C');
    const baixo = tracks.find(t => t.name === 'Baixo')!;
    expect(baixo.midiNotes).toBeDefined();
    for (const n of baixo.midiNotes!) {
      expect(n.pitch).toBeLessThan(60);
    }
  });

  it('bpm affects MIDI note start times and durations', () => {
    const slow = generateTracksForGenre('edm', 60, 'C');
    const fast = generateTracksForGenre('edm', 200, 'C');
    const slowTrack = slow.find(t => t.midiNotes && t.midiNotes.length > 0)!;
    const fastTrack = fast.find(t => t.midiNotes && t.midiNotes.length > 0)!;
    expect(slowTrack.midiNotes![1].start).toBeGreaterThan(fastTrack.midiNotes![1].start);
    expect(slowTrack.midiNotes![0].duration).toBeGreaterThan(fastTrack.midiNotes![0].duration);
  });


});

describe('mastering.ts', () => {
  it('MASTERING_CHAIN_PRESETS has exactly 10 presets', () => {
    expect(MASTERING_CHAIN_PRESETS).toHaveLength(10);
  });

  it('each preset has name, description, and plugins', () => {
    for (const p of MASTERING_CHAIN_PRESETS) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(Array.isArray(p.plugins)).toBe(true);
      expect(p.plugins.length).toBeGreaterThan(0);
    }
  });

  it('buildMasteringChain returns plugin array', () => {
    const plugins = buildMasteringChain(MASTERING_CHAIN_PRESETS[0]);
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins).toHaveLength(MASTERING_CHAIN_PRESETS[0].plugins.length);
    for (const p of plugins) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.type).toBeTruthy();
      expect(p.enabled).toBe(true);
      expect(p.params).toBeTruthy();
    }
  });

  it('buildMasteringChain creates unique IDs', () => {
    let callCount = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => 1000 + callCount++);
    const chain1 = buildMasteringChain(MASTERING_CHAIN_PRESETS[0]);
    const chain2 = buildMasteringChain(MASTERING_CHAIN_PRESETS[0]);
    expect(chain1[0].id).not.toBe(chain2[0].id);
    vi.restoreAllMocks();
  });

  it('getOversampleLabel returns correct labels', () => {
    expect(getOversampleLabel(0)).toBe('1x');
    expect(getOversampleLabel(1)).toBe('2x');
    expect(getOversampleLabel(2)).toBe('4x');
    expect(getOversampleLabel(3)).toBe('8x');
    expect(getOversampleLabel(-1)).toBe('2x');
    expect(getOversampleLabel(99)).toBe('2x');
  });

  it('includes expected presets', () => {
    const names = MASTERING_CHAIN_PRESETS.map(p => p.name);
    expect(names).toContain('Master Rápido');
    expect(names).toContain('Master Completo');
    expect(names).toContain('Rádio / Podcast');
    expect(names).toContain('Vintage Warm');
    expect(names).toContain('Lo-Fi Vibe');
  });

  it('Master Rápido has 3 plugins', () => {
    const master = MASTERING_CHAIN_PRESETS.find(p => p.name === 'Master Rápido');
    expect(master?.plugins).toHaveLength(3);
  });

  it('all preset plugins have name, type, and color', () => {
    for (const preset of MASTERING_CHAIN_PRESETS) {
      for (const plugin of preset.plugins) {
        expect(plugin.name).toBeTruthy();
        expect(plugin.type).toBeTruthy();
        expect(plugin.color).toBeTruthy();
      }
    }
  });
});

describe('masteringSuite.ts', () => {
  it('MASTERING_PLUGIN_DEFS has 7 plugins', () => {
    expect(MASTERING_PLUGIN_DEFS).toHaveLength(7);
  });

  it('buildSuiteChain returns 7 plugins with default params', () => {
    const chain = buildSuiteChain();
    expect(chain).toHaveLength(7);
    expect(chain[0].name).toBe('Parametric EQ');
    expect(chain[6].name).toBe('Limiter');
  });

  it('createVersion deep-clones plugin params', () => {
    const chain = buildSuiteChain();
    const version = createVersion(chain, 'Test V1', 'testing deep clone');
    expect(version.name).toBe('Test V1');
    expect(version.notes).toBe('testing deep clone');
    expect(version.plugins).toHaveLength(7);
    expect(version.plugins[0].params).not.toBe(chain[0].params);
  });

  it('formatFileSize returns MB for large files', () => {
    expect(formatFileSize(52428800)).toContain('MB');
    expect(formatFileSize(500)).toContain('KB');
  });

  it('formatSampleRate returns kHz string', () => {
    expect(formatSampleRate(44100)).toBe('44.1kHz');
    expect(formatSampleRate(96000)).toBe('96.0kHz');
  });
});
