import { describe, it, expect, vi, beforeEach } from "vitest";

import { parseMidi } from "../src/lib/midiParser";

import {
  SUBTRACTIVE_PRESETS,
  MAX_VOICES,
  createSubtractiveSynth,
} from "../src/lib/subtractiveSynth";
import {
  createOverdriveFactory,
  createDelayNode,
  createChorusNode,
  createTremoloNode,
} from "../src/lib/pedalboardDsp";
import {
  detectTransients,
  sliceAudioBuffer,
} from "../src/lib/transientDetection";

import {
  PROGRESSION_PRESETS,
  resolveProgression,
} from "../src/lib/harmony";
import {
  suggestNextChords,
  chordsToMIDINotes,
} from "../src/lib/harmonicAssistant";
import {
  analyzeBuffer,
  generateAutoMix,
} from "../src/lib/aiAutoMixAnalysis";
import { autoMix, AUTOMIX_GENRES } from "../src/lib/automix";
import type { TrackDef } from "../src/lib/types";

function makeBuffer(
  channels: number,
  length: number,
  sampleRate: number,
  fill?: (ch: number, i: number) => number,
): AudioBuffer {
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const arr = new Float32Array(length);
    if (fill) for (let i = 0; i < length; i++) arr[i] = fill(c, i);
    data.push(arr);
  }
  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (ch: number) => data[ch],
  } as unknown as AudioBuffer;
}

const realCtx = globalThis as Record<string, unknown>;

beforeEach(() => {
  const mockCtx = {
    createDelay: vi.fn(() => ({
      delayTime: { value: 0 },
      connect: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: { value: 0, setValueAtTime: vi.fn(), connect: vi.fn() },
      connect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: "",
      frequency: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn(
      (channels: number, length: number, _sr: number) => {
        const bufs: Float32Array[] = [];
        for (let c = 0; c < channels; c++) bufs.push(new Float32Array(length));
        return {
          numberOfChannels: channels,
          length,
          sampleRate: 44100,
          duration: length / 44100,
          getChannelData: (ch: number) => bufs[ch],
        };
      },
    ),
    audioWorklet: undefined,
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
  };
  realCtx.AudioContext = vi.fn(function () {
    return mockCtx;
  });
  realCtx.OfflineAudioContext = vi.fn(function () {
    return mockCtx;
  });
  realCtx.AudioWorkletNode = vi.fn(function () {
    return { port: { postMessage: vi.fn() } };
  });
});

function buildSmf(): ArrayBuffer {
  const header = [
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0,
  ];
  const trackEvents = [
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
    0x00, 0x90, 0x3c, 0x64,
    0x40, 0x80, 0x3c, 0x00,
    0x00, 0xff, 0x2f, 0x00,
  ];
  const track = [
    0x4d, 0x54, 0x72, 0x6b,
    (trackEvents.length >> 24) & 0xff,
    (trackEvents.length >> 16) & 0xff,
    (trackEvents.length >> 8) & 0xff,
    trackEvents.length & 0xff,
    ...trackEvents,
  ];
  const all = [...header, ...track];
  return new Uint8Array(all).buffer;
}

describe("midi-pipeline: parseMidi", () => {
  it("parses a hand-built SMF into MidiData", () => {
    const parsed = parseMidi(buildSmf());
    expect(parsed).not.toBeNull();
    expect(parsed!.ticksPerQuarter).toBe(480);
    expect(parsed!.bpm).toBe(120);
    expect(parsed!.tracks.length).toBe(1);
  });

  it("extracts note on/off as a single MidiNote", () => {
    const parsed = parseMidi(buildSmf())!;
    expect(parsed.tracks[0].notes.length).toBe(1);
    const note = parsed.tracks[0].notes[0];
    expect(note.note).toBe(60);
    expect(note.start).toBe(0);
    expect(note.duration).toBe(64);
  });

  it("returns null for non-MIDI input", () => {
    const bad = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(parseMidi(bad)).toBeNull();
  });
});

describe("audio-dsp: subtractive synth", () => {
  it("exposes 25 presets and a 16-voice cap", () => {
    expect(Object.keys(SUBTRACTIVE_PRESETS).length).toBe(25);
    expect(MAX_VOICES).toBe(16);
  });

  it("createSubtractiveSynth returns a usable synth with default config", () => {
    const synth = createSubtractiveSynth();
    expect(typeof synth.noteOn).toBe("function");
    expect(typeof synth.noteOff).toBe("function");
    expect(typeof synth.getConfig).toBe("function");
    expect(typeof synth.dispose).toBe("function");
    expect(synth.getConfig().volume).toBe(0.5);
    expect(() => synth.dispose()).not.toThrow();
  });
});

describe("audio-dsp: pedal DSP + transients", () => {
  it("overdrive factory produces a function returning an AudioWorkletNode", () => {
    const factory = createOverdriveFactory(50, 50);
    const ctx = new (realCtx.AudioContext as any)();
    const node = factory(ctx);
    expect(node).toBeDefined();
  });

  it("delay/chorus/tremolo factories return AudioNodes", () => {
    const ctx = new (realCtx.AudioContext as any)();
    expect(createDelayNode(ctx)).toBeDefined();
    expect(createChorusNode(ctx)).toBeDefined();
    expect(createTremoloNode(ctx)).toBeDefined();
  });

  it("detectTransients returns a Transient array", () => {
    const buf = makeBuffer(1, 4410, 44100, (_c, i) =>
      Math.sin((2 * Math.PI * 440 * i) / 44100) * (i % 1000 < 100 ? 0.9 : 0.05),
    );
    const transients = detectTransients(buf);
    expect(Array.isArray(transients)).toBe(true);
  });

  it("sliceAudioBuffer preserves channel count (2-channel)", () => {
    const buf = makeBuffer(2, 44100, 44100, (c, _i) =>
      (c === 0 ? 0.5 : -0.5),
    );
    const slices = sliceAudioBuffer(buf, [0.5]);
    expect(slices.length).toBeGreaterThan(0);
    for (const slice of slices) {
      expect(slice.numberOfChannels).toBe(2);
    }
  });
});

describe("ai-automix: harmony + harmonic assistant", () => {
  it("PROGRESSION_PRESETS has exactly 10 entries", () => {
    expect(PROGRESSION_PRESETS.length).toBe(10);
  });

  it("resolveProgression returns a pitch array per degree", () => {
    const progression = PROGRESSION_PRESETS[0].degrees;
    const resolved = resolveProgression(progression, 60, "major");
    expect(resolved.length).toBe(progression.length);
    for (const chord of resolved) expect(chord.length).toBeGreaterThanOrEqual(3);
  });

  it("suggestNextChords returns starter suggestions for empty progression", () => {
    const suggestions = suggestNextChords([]);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(typeof suggestions[0].degree).toBe("number");
  });

  it("chordsToMIDINotes returns non-empty MIDINote[]", () => {
    const notes = chordsToMIDINotes(
      [{ id: "a", degree: 0, quality: "maj", beats: 4 }],
      "C",
      120,
    );
    expect(notes.length).toBe(3);
    expect(notes[0].start).toBe(0);
  });
});

describe("ai-automix: analysis + genre mix", () => {
  it("analyzeBuffer returns sane finite numbers", () => {
    const buf = makeBuffer(1, 4410, 44100, (_c, i) =>
      Math.sin((2 * Math.PI * 220 * i) / 44100) * 0.6,
    );
    const analysis = analyzeBuffer(buf, "t1", "Kick");
    expect(Number.isFinite(analysis.rmsLevel)).toBe(true);
    expect(Number.isFinite(analysis.peakDb)).toBe(true);
    expect(Number.isFinite(analysis.lufs)).toBe(true);
    const sb = analysis.spectralBalance;
    expect(Math.abs(sb.low + sb.mid + sb.high - 1)).toBeLessThan(0.001);
  });

  it("generateAutoMix yields volume within [0,1]", () => {
    const buf = makeBuffer(1, 4410, 44100, () => 0.5);
    const analysis = analyzeBuffer(buf, "t1", "Kick");
    const result = generateAutoMix([analysis]);
    expect(result.suggestions[0].volume).toBeGreaterThanOrEqual(0);
    expect(result.suggestions[0].volume).toBeLessThanOrEqual(1);
  });

  it("autoMix classifies a Kick track and adjusts volume", () => {
    const track: TrackDef = {
      id: "k1",
      name: "Kick",
      color: "#fff",
      muted: false,
      solo: false,
      volume: 50,
      pan: 0,
      sends: {},
      regions: [],
      midiNotes: [],
      sidechainSource: null,
      plugins: [],
      automation: {},
      outputId: null,
    };
    expect(AUTOMIX_GENRES).toContain("rock");
    const mixed = autoMix([track], "rock");
    expect(mixed[0].volume).not.toBe(50);
    expect(mixed[0].volume).toBeGreaterThan(0);
  });
});
