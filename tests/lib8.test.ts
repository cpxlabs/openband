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

// ─── mastering.ts ───
import {
  MASTERING_CHAIN_PRESETS,
  buildMasteringChain,
  applyMasteringChain,
  getOversampleLabel,
} from "../src/lib/mastering";

// ─── audio.ts ───
import {
  audioBufferToWavBlob,
  audioBufferToMp3BlobAsync,
  generateWaveform,
  djb2Hash,
} from "../src/lib/audio";

// ─── universalAudio.ts ───
import { markBlobActive } from "../src/lib/universalAudio";

// ─── helpers ───
function MockOfflineAudioContext(this: any, _ch: number, _len: number, _sr: number) {
  const node = () => ({
    connect: function () { return node(); },
    start: () => {},
    stop: () => {},
    gain: { value: 1 },
    frequency: { value: 0 },
    Q: { value: 0 },
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 12 },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    curve: null,
    type: "lowpass",
    buffer: null,
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
      };
    },
    createBufferSource: () => node(),
    createBiquadFilter: () => node(),
    createDynamicsCompressor: () => node(),
    createGain: () => node(),
    createWaveShaper: () => node(),
    createChannelSplitter: () => node(),
    createChannelMerger: () => node(),
    startRendering: () => {
      return Promise.resolve({
        numberOfChannels: _ch,
        length: _len,
        sampleRate: _sr,
        getChannelData: () => new Float32Array(_len),
      });
    },
    destination: node(),
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

// ─── mastering.ts ───
describe("mastering", () => {
  describe("MASTERING_CHAIN_PRESETS", () => {
    it("has at least 9 presets", () => {
      expect(MASTERING_CHAIN_PRESETS.length).toBeGreaterThanOrEqual(9);
    });

    it("each preset has name, description, and plugins array", () => {
      for (const preset of MASTERING_CHAIN_PRESETS) {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(Array.isArray(preset.plugins)).toBe(true);
        expect(preset.plugins.length).toBeGreaterThan(0);
      }
    });

    it("first preset is Master Rápido", () => {
      expect(MASTERING_CHAIN_PRESETS[0].name).toBe("Master Rápido");
    });

    it("each plugin in presets has name, type, and color", () => {
      for (const preset of MASTERING_CHAIN_PRESETS) {
        for (const p of preset.plugins) {
          expect(p.name).toBeTruthy();
          expect(p.type).toBeTruthy();
          expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    });
  });

  describe("buildMasteringChain", () => {
    it("returns array of Plugin objects", () => {
      const plugins = buildMasteringChain(MASTERING_CHAIN_PRESETS[0]);
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBe(3);
      expect(plugins[0].id).toBeTruthy();
      expect(plugins[0].enabled).toBe(true);
    });

    it("each plugin has id starting with master-chain-", () => {
      const plugins = buildMasteringChain(MASTERING_CHAIN_PRESETS[1]);
      for (const p of plugins) {
        expect(p.id).toMatch(/^master-chain-/);
      }
    });
  });

  describe("applyMasteringChain", () => {
    it("returns an AudioBuffer with same number of channels", async () => {
      const buffer = mockAudioBuffer(2, 4096, 44100);
      const plugins: Plugin[] = [
        { id: "eq1", name: "EQ", type: "eq", enabled: true, params: {}, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.numberOfChannels).toBe(2);
      expect(result.length).toBe(4096);
    });

    it("returns a valid AudioBuffer after compressor applied", async () => {
      const buffer = mockAudioBuffer(2, 8192, 44100);
      const plugins: Plugin[] = [
        {
          id: "comp1", name: "Comp", type: "compressor", enabled: true,
          params: { threshold: -30, ratio: 20, attack: 1, release: 50 },
          color: "#fff",
        },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result).toBeTruthy();
      expect(result.numberOfChannels).toBe(2);
      expect(result.length).toBe(8192);
      expect(typeof result.getChannelData).toBe("function");
    });

    it("applies limiter without crashing", async () => {
      const buffer = mockAudioBuffer(1, 2048, 44100);
      const plugins: Plugin[] = [
        { id: "lim1", name: "Limiter", type: "limiter", enabled: true, params: {}, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(2048);
    });

    it("applies truePeakLimiter without crashing", async () => {
      const buffer = mockAudioBuffer(2, 2048, 44100);
      const plugins: Plugin[] = [
        { id: "tpl1", name: "TP Limiter", type: "truePeakLimiter", enabled: true, params: {}, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(2048);
    });

    it("applies tapeSaturator without crashing", async () => {
      const buffer = mockAudioBuffer(1, 2048, 44100);
      const plugins: Plugin[] = [
        { id: "tapesat", name: "Tape", type: "tapeSaturator", enabled: true, params: { drive: 3 }, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(2048);
    });

    it("applies deesser without crashing", async () => {
      const buffer = mockAudioBuffer(1, 2048, 44100);
      const plugins: Plugin[] = [
        { id: "deesser1", name: "De-Ess", type: "deesser", enabled: true, params: { frequency: 7000, q: 1 }, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(2048);
    });

    it("applies multibandCompressor without crashing", async () => {
      const buffer = mockAudioBuffer(2, 4096, 44100);
      const plugins: Plugin[] = [
        {
          id: "mbc", name: "MB Comp", type: "multibandCompressor", enabled: true,
          params: { crossLow: 200, crossHigh: 2000, thresholdLow: -20, ratioLow: 4 },
          color: "#fff",
        },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(4096);
    });

    it("applies stereoImager without crashing", async () => {
      const buffer = mockAudioBuffer(2, 2048, 44100);
      const plugins: Plugin[] = [
        { id: "imager", name: "Imager", type: "stereoImager", enabled: true, params: { width: 150 }, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(2048);
    });

    it("skips disabled plugins", async () => {
      const buffer = mockAudioBuffer(1, 2048, 44100);
      const plugins: Plugin[] = [
        { id: "skip", name: "Skip", type: "compressor", enabled: false, params: {}, color: "#fff" },
        { id: "eq1", name: "EQ", type: "eq", enabled: true, params: {}, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(2048);
    });

    it("chains multiple plugins in order", async () => {
      const buffer = mockAudioBuffer(2, 4096, 44100);
      const plugins: Plugin[] = [
        { id: "eq1", name: "EQ", type: "eq", enabled: true, params: {}, color: "#fff" },
        { id: "comp1", name: "Comp", type: "compressor", enabled: true, params: { threshold: -20, ratio: 4 }, color: "#fff" },
        { id: "lim1", name: "Limiter", type: "limiter", enabled: true, params: {}, color: "#fff" },
      ];
      const result = await applyMasteringChain(buffer, plugins, 44100);
      expect(result.length).toBe(4096);
    });
  });

  describe("getOversampleLabel", () => {
    it("returns 1x for 0", () => expect(getOversampleLabel(0)).toBe("1x"));
    it("returns 2x for 1", () => expect(getOversampleLabel(1)).toBe("2x"));
    it("returns 4x for 2", () => expect(getOversampleLabel(2)).toBe("4x"));
    it("returns 8x for 3", () => expect(getOversampleLabel(3)).toBe("8x"));
    it("defaults to 2x for unknown", () => expect(getOversampleLabel(99)).toBe("2x"));
  });
});

// ─── audio.ts ───
describe("audio", () => {
  describe("djb2Hash", () => {
    it("returns a number for any string", () => {
      expect(typeof djb2Hash("hello")).toBe("number");
    });

    it("returns consistent results for same input", () => {
      expect(djb2Hash("test")).toBe(djb2Hash("test"));
    });

    it("returns different values for different inputs", () => {
      expect(djb2Hash("abc")).not.toBe(djb2Hash("xyz"));
    });

    it("handles empty string", () => {
      expect(typeof djb2Hash("")).toBe("number");
    });

    it("returns non-negative", () => {
      expect(djb2Hash("anything")).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateWaveform", () => {
    it("returns an array of the requested length", () => {
      const result = generateWaveform("test", 100);
      expect(result.length).toBe(100);
    });

    it("returns values between -1 and 1", () => {
      const result = generateWaveform("test", 1000);
      for (const v of result) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("caches and returns same data for same seed", () => {
      const a = generateWaveform("cache-test", 50);
      const b = generateWaveform("cache-test", 50);
      expect(a).toEqual(b);
    });

    it("returns different data for different seeds", () => {
      const a = generateWaveform("seed-a", 100);
      const b = generateWaveform("seed-b", 100);
      expect(a).not.toEqual(b);
    });

    it("handles large request (5000 points)", () => {
      const result = generateWaveform("large", 5000);
      expect(result.length).toBe(5000);
    });

    it("handles count of 0", () => {
      const result = generateWaveform("zero", 0);
      expect(result).toEqual([]);
    });
  });

  describe("audioBufferToWavBlob", () => {
    it("returns a Blob with audio/wav type", () => {
      const buffer = mockAudioBuffer(1, 100, 44100);
      const blob = audioBufferToWavBlob(buffer, 16);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/wav");
    });

    it("creates 16-bit WAV with correct header size", async () => {
      const buffer = mockAudioBuffer(1, 100, 44100);
      const blob = audioBufferToWavBlob(buffer, 16);
      const arrayBuf = await blob.arrayBuffer();
      const view = new DataView(arrayBuf);
      const header = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
      );
      expect(header).toBe("RIFF");
      const wave = String.fromCharCode(
        view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11),
      );
      expect(wave).toBe("WAVE");
    });

    it("creates stereo 24-bit WAV", () => {
      const buffer = mockAudioBuffer(2, 100, 44100);
      const blob = audioBufferToWavBlob(buffer, 24);
      expect(blob.size).toBeGreaterThan(0);
    });

    it("creates 32-bit float WAV", () => {
      const buffer = mockAudioBuffer(2, 100, 48000);
      const blob = audioBufferToWavBlob(buffer, 32);
      expect(blob.size).toBeGreaterThan(0);
    });

    it("size increases with sample length", () => {
      const buf1 = mockAudioBuffer(1, 100, 44100);
      const buf2 = mockAudioBuffer(1, 200, 44100);
      const blob1 = audioBufferToWavBlob(buf1, 16);
      const blob2 = audioBufferToWavBlob(buf2, 16);
      expect(blob2.size).toBeGreaterThan(blob1.size);
    });
  });

  describe("audioBufferToMp3BlobAsync", () => {
    it("returns a Blob with audio/mpeg type", async () => {
      const buffer = mockAudioBuffer(2, 44100, 44100);
      const blob = await audioBufferToMp3BlobAsync(buffer, 128);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/mpeg");
    });

    it("produces an mp3 blob", async () => {
      const buffer = mockAudioBuffer(2, 44100, 44100);
      const mp3 = await audioBufferToMp3BlobAsync(buffer, 64);
      expect(mp3.size).toBeGreaterThan(0);
    });

    it("handles mono buffer", async () => {
      const buffer = mockAudioBuffer(1, 44100, 44100);
      const blob = await audioBufferToMp3BlobAsync(buffer, 128);
      expect(blob.size).toBeGreaterThan(0);
    });

    it("handles very short buffer (less than one MP3 frame)", async () => {
      const buffer = mockAudioBuffer(2, 100, 44100);
      const blob = await audioBufferToMp3BlobAsync(buffer, 128);
      expect(blob.size).toBeGreaterThan(0);
    });

    it("calls onProgress callback", async () => {
      const buffer = mockAudioBuffer(2, 44100 * 3, 44100);
      const onProgress = vi.fn();
      await audioBufferToMp3BlobAsync(buffer, 128, onProgress);
      expect(onProgress).toHaveBeenCalled();
    });

    it("uses Mp3Encoder and returns audio/mpeg blob", async () => {
      const buffer = mockAudioBuffer(2, 44100, 44100);
      const blob = await audioBufferToMp3BlobAsync(buffer, 320);
      expect(blob.type).toBe("audio/mpeg");
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});

// ─── universalAudio.ts (markBlobActive) ───
describe("universalAudio markBlobActive", () => {
  it("exists and is a function", () => {
    expect(markBlobActive).toBeDefined();
    expect(typeof markBlobActive).toBe("function");
  });

  it("accepts a string URL without throwing", () => {
    expect(() => markBlobActive("blob:http://localhost/test")).not.toThrow();
  });

  it("accepts empty string without throwing", () => {
    expect(() => markBlobActive("")).not.toThrow();
  });

  it("accepts https URL without throwing", () => {
    expect(() => markBlobActive("https://example.com/audio.wav")).not.toThrow();
  });
});
