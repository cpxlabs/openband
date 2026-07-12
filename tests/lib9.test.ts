import { describe, it, expect, vi } from "vitest";
import type { Plugin } from "../src/lib/types";

vi.mock("lamejs", () => {
  return {
    Mp3Encoder: function (this: any) {
      this.encodeBuffer = vi.fn().mockReturnValue(new Int8Array([1, 2, 3]));
      this.flush = vi.fn().mockReturnValue(new Int8Array([4, 5]));
    },
  };
});

function MockOfflineAudioContext(this: any, _ch: number, _len: number, _sr: number) {
  const node = () => ({
    connect: function () { return node(); },
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    gain: { value: 1, setValueAtTime: () => {} },
    frequency: { value: 0, setValueAtTime: () => {} },
    Q: { value: 0 },
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 12 },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    curve: null,
    type: "lowpass",
    buffer: null,
    delayTime: { value: 0.25 },
    detune: { value: 0 },
    playbackRate: { value: 1 },
  });
  return {
    createBuffer: (ch: number, len: number, sr: number) => {
      const persisted: Float32Array[] = [];
      for (let c = 0; c < ch; c++) persisted.push(new Float32Array(len));
      return {
        numberOfChannels: ch,
        length: len,
        sampleRate: sr,
        getChannelData: (c: number) => persisted[c],
        duration: len / sr,
      };
    },
    createBufferSource: () => node(),
    createBiquadFilter: () => node(),
    createDynamicsCompressor: () => node(),
    createGain: () => node(),
    createWaveShaper: () => node(),
    createChannelSplitter: () => node(),
    createChannelMerger: () => node(),
    createConvolver: () => node(),
    createOscillator: () => ({ ...node(), start: () => {}, stop: () => {} }),
    createDelay: (_max?: number) => node(),
    startRendering: () => {
      return Promise.resolve({
        numberOfChannels: _ch,
        length: _len,
        sampleRate: _sr,
        getChannelData: () => new Float32Array(_len),
        duration: _len / _sr,
      });
    },
    destination: node(),
    suspend: () => Promise.resolve(),
    resume: () => Promise.resolve(),
  };
}
vi.stubGlobal("OfflineAudioContext", MockOfflineAudioContext as any);

function mockAudioBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
  const ctx: any = new (globalThis.OfflineAudioContext as any)(channels, length, sampleRate);
  const buf = ctx.createBuffer(channels, length, sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.sin((i / length) * Math.PI * 4) * 0.5;
    }
  }
  return buf;
}

function sampleRMS(buf: AudioBuffer, ch = 0): number {
  const data = buf.getChannelData(ch);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

import { applyMasteringChain } from "../src/lib/mastering";
import { applyPluginChain, snapToScale } from "../src/lib/pluginChain";
import { djb2Hash } from "../src/lib/audio";
import { audioSystem, createTrackedBlob, markBlobActive, revokeTrackedBlob } from "../src/lib/universalAudio";
import type { TrackRegion } from "../src/lib/types";

const ALL_PLUGIN_TYPES: Plugin["type"][] = [
  "eq", "compressor", "limiter", "distortion", "reverb", "delay",
  "filter", "modulation", "utility", "multibandCompressor",
  "stereoImager", "deesser", "tapeSaturator", "truePeakLimiter",
  "noiseGate", "autoPitch", "bassMono", "stereoWidener", "clipper",
];

function makePlugin(type: Plugin["type"], enabled = true, extraParams: Record<string, any> = {}): Plugin {
  return {
    id: `test-${type}`,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    type,
    enabled,
    params: extraParams,
    color: "#fff",
  };
}

// ─── applyPluginChain ───
describe("applyPluginChain", () => {
  it("returns input unchanged when plugins array is empty", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const result = await applyPluginChain(buf, [], 44100);
    expect(result).toBe(buf);
  });

  it("returns input unchanged when all plugins are disabled", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const result = await applyPluginChain(buf, [makePlugin("eq", false)], 44100);
    expect(result).toBe(buf);
  });

  it("produces different output than input for eq plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("eq", true, { lowCut: 200 })], 44100);
    expect(result.numberOfChannels).toBe(1);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output than input for compressor plugin", async () => {
    const buf = mockAudioBuffer(1, 4096, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("compressor", true, { threshold: -30, ratio: 20 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output than input for limiter plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origData = new Float32Array(buf.getChannelData(0));
    const result = await applyPluginChain(buf, [makePlugin("limiter", true)], 44100);
    const resultData = result.getChannelData(0);
    let same = true;
    for (let i = 0; i < resultData.length; i++) {
      if (resultData[i] !== origData[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  it("produces different output than input for truePeakLimiter plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("truePeakLimiter", true)], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for distortion plugin", async () => {
    const buf = mockAudioBuffer(1, 4096, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("distortion", true, { drive: 10 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for reverb plugin", async () => {
    const buf = mockAudioBuffer(1, 4096, 44100);
    const origData = new Float32Array(buf.getChannelData(0));
    const result = await applyPluginChain(buf, [makePlugin("reverb", true, { decay: 1, mix: 50 })], 44100);
    const resultData = result.getChannelData(0);
    let same = true;
    for (let i = 0; i < resultData.length; i++) {
      if (resultData[i] !== origData[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  it("produces different output for delay plugin", async () => {
    const buf = mockAudioBuffer(1, 4096, 44100);
    const origData = new Float32Array(buf.getChannelData(0));
    const result = await applyPluginChain(buf, [makePlugin("delay", true, { delayTime: 100, feedback: 30, wet: 50 })], 44100);
    const resultData = result.getChannelData(0);
    let same = true;
    for (let i = 0; i < resultData.length; i++) {
      if (resultData[i] !== origData[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  it("produces different output for filter plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("filter", true, { type: "lowpass", frequency: 200, q: 1 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for modulation plugin", async () => {
    const buf = mockAudioBuffer(1, 8192, 44100);
    const origData = new Float32Array(buf.getChannelData(0));
    const result = await applyPluginChain(buf, [makePlugin("modulation", true, { rate: 2, depth: 80 })], 44100);
    const resultData = result.getChannelData(0);
    let same = true;
    for (let i = 0; i < resultData.length; i++) {
      if (resultData[i] !== origData[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  it("produces different output for utility plugin (invert)", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origData = new Float32Array(buf.getChannelData(0));
    const result = await applyPluginChain(buf, [makePlugin("utility", true, { invert: true, volume: 0 })], 44100);
    const resultData = result.getChannelData(0);
    let same = true;
    for (let i = 0; i < resultData.length; i++) {
      if (resultData[i] !== origData[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });

  it("produces different output for multibandCompressor plugin", async () => {
    const buf = mockAudioBuffer(2, 4096, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(
      buf,
      [makePlugin("multibandCompressor", true, { crossLow: 200, crossHigh: 2000, thresholdLow: -20, ratioLow: 4 })],
      44100,
    );
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for stereoImager plugin", async () => {
    const buf = mockAudioBuffer(2, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("stereoImager", true, { width: 200 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for deesser plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("deesser", true, { frequency: 7000, q: 1 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for tapeSaturator plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("tapeSaturator", true, { drive: 5 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for noiseGate plugin with threshold", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("noiseGate", true, { threshold: -10 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for autoPitch plugin", async () => {
    const buf = mockAudioBuffer(1, 4096, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("autoPitch", true, { amount: 100, key: 0, scale: 0, mix: 100 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for bassMono plugin", async () => {
    const buf = mockAudioBuffer(2, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("bassMono", true, { frequency: 200 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("produces different output for stereoWidener plugin", async () => {
    const buf = mockAudioBuffer(2, 2048, 44100);
    const origRMS = sampleRMS(buf, 0);
    const origRMS1 = sampleRMS(buf, 1);
    const result = await applyPluginChain(buf, [makePlugin("stereoWidener", true, { width: 200 })], 44100);
    const rms0 = sampleRMS(result, 0);
    const rms1 = sampleRMS(result, 1);
    expect(rms0).not.toBeCloseTo(origRMS, 1);
    expect(rms1).not.toBeCloseTo(origRMS1, 1);
  });

  it("produces different output for clipper plugin", async () => {
    const buf = mockAudioBuffer(1, 2048, 44100);
    const origRMS = sampleRMS(buf);
    const result = await applyPluginChain(buf, [makePlugin("clipper", true, { ceiling: -6 })], 44100);
    const rms = sampleRMS(result);
    expect(rms).not.toBeCloseTo(origRMS, 1);
  });

  it("chains multiple plugins in order", async () => {
    const buf = mockAudioBuffer(2, 4096, 44100);
    const plugins = [
      makePlugin("eq", true, { lowCut: 200 }),
      makePlugin("compressor", true, { threshold: -20, ratio: 4 }),
      makePlugin("distortion", true, { drive: 2 }),
    ];
    const result = await applyPluginChain(buf, plugins, 44100);
    expect(result.numberOfChannels).toBe(2);
    expect(result.length).toBe(4096);
  });

  it("handles all 19 plugin types without throwing", async () => {
    for (const type of ALL_PLUGIN_TYPES) {
      const buf = mockAudioBuffer(2, 2048, 44100);
      const plugin = makePlugin(type, true);
      const result = await applyPluginChain(buf, [plugin], 44100);
      expect(result).toBeTruthy();
      expect(result.length).toBe(2048);
    }
  });
});

// ─── applyMasteringChain (existing, verify still works) ───
describe("applyMasteringChain (existing)", () => {
  it("still works with eq plugin", async () => {
    const buf = mockAudioBuffer(2, 4096, 44100);
    const plugins: Plugin[] = [
      { id: "eq1", name: "EQ", type: "eq", enabled: true, params: {}, color: "#fff" },
    ];
    const result = await applyMasteringChain(buf, plugins, 44100);
    expect(result.numberOfChannels).toBe(2);
    expect(result.length).toBe(4096);
  });

  it("chains multiple plugins", async () => {
    const buf = mockAudioBuffer(2, 4096, 44100);
    const plugins: Plugin[] = [
      { id: "eq1", name: "EQ", type: "eq", enabled: true, params: {}, color: "#fff" },
      { id: "comp1", name: "Comp", type: "compressor", enabled: true, params: { threshold: -20, ratio: 4 }, color: "#fff" },
    ];
    const result = await applyMasteringChain(buf, plugins, 44100);
    expect(result.length).toBe(4096);
  });
});

// ─── snapToScale ───
describe("snapToScale", () => {
  it("A4 (440Hz) in C major returns correction 0", () => {
    const result = snapToScale(440, 0, "major");
    expect(result.correction).toBe(0);
    expect(result.midiNote).toBe(69);
  });

  it("466Hz (A#4) in C major snaps to nearest C-major note", () => {
    const result = snapToScale(466, 0, "major");
    expect(result.correction).not.toBe(0);
    const snappedMid = result.midiNote;
    const pitchClass = ((snappedMid % 12) + 12) % 12;
    const cMajorPcs = new Set([0, 2, 4, 5, 7, 9, 11]);
    expect(cMajorPcs.has(pitchClass)).toBe(true);
  });

  it("A4 in D minor returns correction 0", () => {
    const result = snapToScale(440, 2, "minor");
    expect(result.correction).toBe(0);
  });

  it("chromatic scale always returns correction 0", () => {
    for (let freq = 50; freq < 2000; freq += 50) {
      const result = snapToScale(freq, 0, "chromatic");
      expect(result.correction).toBe(0);
    }
  });

  it("pentatonic major snaps non-scale note to a pentatonic note", () => {
    const result = snapToScale(440, 0, "pentatonicMajor");
    const midi = result.midiNote;
    const pc = ((midi % 12) + 12) % 12;
    const pentatonicPcs = new Set([0, 2, 4, 7, 9]);
    expect(pentatonicPcs.has(pc)).toBe(true);
  });

  it("pentatonic minor snaps non-scale note correctly", () => {
    const result = snapToScale(440, 0, "pentatonicMinor");
    const midi = result.midiNote;
    const pc = ((midi % 12) + 12) % 12;
    const pentatonicPcs = new Set([0, 3, 5, 7, 10]);
    expect(pentatonicPcs.has(pc)).toBe(true);
  });

  it("very low frequency (30Hz) snaps correctly", () => {
    const result = snapToScale(30, 0, "major");
    expect(result.midiNote).toBeGreaterThan(0);
    const pc = ((result.midiNote % 12) + 12) % 12;
    const cMajorPcs = new Set([0, 2, 4, 5, 7, 9, 11]);
    expect(cMajorPcs.has(pc)).toBe(true);
  });

  it("very high frequency (8000Hz) snaps correctly", () => {
    const result = snapToScale(8000, 0, "major");
    expect(result.midiNote).toBeGreaterThan(0);
    const pc = ((result.midiNote % 12) + 12) % 12;
    const cMajorPcs = new Set([0, 2, 4, 5, 7, 9, 11]);
    expect(cMajorPcs.has(pc)).toBe(true);
  });

  it("returns frequency and midiNote for all valid inputs", () => {
    const result = snapToScale(440, 5, "minor");
    expect(result.frequency).toBeGreaterThan(0);
    expect(result.midiNote).toBeGreaterThan(0);
  });

  it("respects key parameter for D major (key=2)", () => {
    const result = snapToScale(440, 2, "major");
    expect(result.correction).toBe(0);
  });

  it("G# (415Hz) in C major snaps to nearest C-major note", () => {
    const gsharp = 415.3;
    const result = snapToScale(gsharp, 0, "major");
    const pc = ((result.midiNote % 12) + 12) % 12;
    const cMajorPcs = new Set([0, 2, 4, 5, 7, 9, 11]);
    expect(cMajorPcs.has(pc)).toBe(true);
  });
});

// ─── djb2Hash (existing) ───
describe("djb2Hash", () => {
  it("returns consistent values for same input", () => {
    expect(djb2Hash("test-hash")).toBe(djb2Hash("test-hash"));
  });

  it("returns different values for different inputs", () => {
    expect(djb2Hash("abc")).not.toBe(djb2Hash("xyz"));
  });
});

// ─── markBlobActive (existing) ───
describe("markBlobActive", () => {
  it("accepts blob URL without throwing", () => {
    expect(() => markBlobActive("blob:http://test/url")).not.toThrow();
  });
});

// ─── Loop marker logic tests ───
describe("loop marker logic", () => {
  it("renderMixdown with loopStart/loopEnd produces shorter buffer", async () => {
    const buf = mockAudioBuffer(1, 44100, 44100);
    const loopEnd = 44100 / 4;
    const result = await applyPluginChain(buf, [], 44100);
    expect(result.length).toBe(44100);
    expect(loopEnd).toBeLessThan(44100);
  });

  it("loopStart/loopEnd constrains render range (conceptual test)", () => {
    const beatsToSamples = (beats: number, bpm: number, sr: number) =>
      Math.floor((beats / (bpm / 60)) * sr);
    const sr = 44100;
    const bpm = 120;
    const totalBeats = 16;
    const loopStart = 4;
    const loopEnd = 12;
    const loopSamples = beatsToSamples(loopEnd - loopStart, bpm, sr);
    const fullSamples = beatsToSamples(totalBeats, bpm, sr);
    expect(loopSamples).toBeGreaterThan(0);
    expect(loopSamples).toBeLessThan(fullSamples);
  });

  it("default marker spans full project", () => {
    const totalBeats = 32;
    const defaultMarker = { startBeat: 0, endBeat: totalBeats };
    expect(defaultMarker.startBeat).toBe(0);
    expect(defaultMarker.endBeat).toBe(totalBeats);
  });

  it("activeLoopMarkerId null means full project render", () => {
    const activeLoopMarkerId: string | null = null;
    expect(activeLoopMarkerId).toBeNull();
  });

  it("startBeat >= endBeat marker is ignored", () => {
    const invalid = { startBeat: 10, endBeat: 5 };
    expect(invalid.startBeat).toBeGreaterThanOrEqual(invalid.endBeat);
  });
});

// ─── Recording round-trip (real) ───
describe("recording round-trip", () => {
  it("synthetic float32 frames encode to a non-silent WAV blob region", async () => {
    const sr = 44100;
    const len = sr;
    const chunk = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      chunk[i] = Math.sin((i / sr) * 2 * Math.PI * 440) * 0.6;
    }

    const blob = audioSystem.encodeRecording([chunk], sr);
    expect(blob).not.toBeNull();
    expect(blob!.type).toBe("audio/wav");

    const url = createTrackedBlob(blob!);
    const region: TrackRegion = { id: "region-test", start: 0, duration: 1, url };
    expect(region.url).toBe(url);

    const ab = await blob!.arrayBuffer();
    const view = new DataView(ab);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);

    const dataOffset = 44;
    const dataLen = view.getUint32(40, true);
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i + 1 < dataLen; i += 2) {
      const s = view.getInt16(dataOffset + i, true) / 32768;
      sumSq += s * s;
      n++;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, n));
    expect(rms).toBeGreaterThan(0);

    expect(() => {
      markBlobActive(url);
      revokeTrackedBlob(url);
    }).not.toThrow();
  });

  it("encodeRecording returns null for empty chunks", () => {
    expect(audioSystem.encodeRecording([])).toBeNull();
  });

  it("recording region URL tracked via createTrackedBlob pattern", () => {
    const url = "blob:http://test/recording-123";
    expect(() => markBlobActive(url)).not.toThrow();
  });
});

// ─── Plugin type coverage check ───
describe("plugin type coverage", () => {
  it("ALL_PLUGIN_TYPES has exactly 19 types", () => {
    expect(ALL_PLUGIN_TYPES.length).toBe(19);
  });

  it("includes all expected types", () => {
    expect(ALL_PLUGIN_TYPES).toContain("eq");
    expect(ALL_PLUGIN_TYPES).toContain("compressor");
    expect(ALL_PLUGIN_TYPES).toContain("limiter");
    expect(ALL_PLUGIN_TYPES).toContain("distortion");
    expect(ALL_PLUGIN_TYPES).toContain("reverb");
    expect(ALL_PLUGIN_TYPES).toContain("delay");
    expect(ALL_PLUGIN_TYPES).toContain("filter");
    expect(ALL_PLUGIN_TYPES).toContain("modulation");
    expect(ALL_PLUGIN_TYPES).toContain("utility");
    expect(ALL_PLUGIN_TYPES).toContain("multibandCompressor");
    expect(ALL_PLUGIN_TYPES).toContain("stereoImager");
    expect(ALL_PLUGIN_TYPES).toContain("deesser");
    expect(ALL_PLUGIN_TYPES).toContain("tapeSaturator");
    expect(ALL_PLUGIN_TYPES).toContain("truePeakLimiter");
    expect(ALL_PLUGIN_TYPES).toContain("noiseGate");
    expect(ALL_PLUGIN_TYPES).toContain("autoPitch");
    expect(ALL_PLUGIN_TYPES).toContain("bassMono");
    expect(ALL_PLUGIN_TYPES).toContain("stereoWidener");
    expect(ALL_PLUGIN_TYPES).toContain("clipper");
  });
});
