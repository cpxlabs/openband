import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTrackedBlob,
  revokeTrackedBlob,
} from "../src/lib/universalAudio";
import { pitchShift } from "../src/lib/timeStretch";

function makeAudioBuffer(
  channels: number,
  length: number,
  sampleRate: number,
): AudioBuffer {
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return {
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (ch: number) => data[ch],
  } as unknown as AudioBuffer;
}

class MockOfflineAudioContext {
  numberOfChannels: number;
  length: number;
  sampleRate: number;

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    return makeAudioBuffer(channels, length, sampleRate);
  }

  startRendering(): Promise<AudioBuffer> {
    return Promise.resolve(
      makeAudioBuffer(this.numberOfChannels, this.length, this.sampleRate),
    );
  }
}

describe("blob URL registry leak protection", () => {
  beforeEach(() => {
    let n = 0;
    (globalThis.URL as any).createObjectURL = vi.fn(
      () => `blob:mock-${n++}`,
    );
    (globalThis.URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createTrackedBlob returns a url without throwing", () => {
    const url = createTrackedBlob(new Blob(["x"]));
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("repeated create/revoke stays bounded and does not throw", () => {
    expect(() => {
      for (let i = 0; i < 300; i++) {
        const url = createTrackedBlob(new Blob(["x"]));
        revokeTrackedBlob(url);
      }
    }).not.toThrow();
  });

  it("revokeTrackedBlob is safe for unknown urls", () => {
    expect(() => revokeTrackedBlob("blob:does-not-exist")).not.toThrow();
  });

  it("revoked urls can be safely revoked again", () => {
    const url = createTrackedBlob(new Blob(["x"]));
    revokeTrackedBlob(url);
    expect(() => revokeTrackedBlob(url)).not.toThrow();
  });
});

describe("pitchShift path used by studio playback", () => {
  beforeEach(() => {
    vi.stubGlobal("OfflineAudioContext", MockOfflineAudioContext as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the same buffer when semitones is 0", async () => {
    const input = makeAudioBuffer(2, 4410, 44100);
    const result = await pitchShift(input, 0);
    expect(result).toBe(input);
  });

  it("returns a buffer of the same length (duration preserved) after shifting", async () => {
    const input = makeAudioBuffer(2, 4410, 44100);
    const result = await pitchShift(input, 3);
    expect(result.numberOfChannels).toBe(2);
    expect(result.length).toBe(4410);
    expect(result.sampleRate).toBe(44100);
  });
});
