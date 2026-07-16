import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockPlatform = { OS: "web" as string };
vi.mock("react-native", () => ({
  Platform: { get OS() { return mockPlatform.OS; } },
  Dimensions: {
    get: vi.fn(() => ({ width: 1920, height: 1080 })),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock("../src/bridge", () => ({
  OpenBandNative: { showOpenDialog: vi.fn() },
}));

describe("web playback autoplay compliance", () => {
  beforeEach(() => {
    mockPlatform.OS = "web";
  });

  afterEach(() => {
    mockPlatform.OS = "web";
    vi.resetModules();
  });

  describe("resumeForGesture", () => {
    it("resumes a suspended AudioContext without throwing and without awaiting", async () => {
      mockPlatform.OS = "web";
      const resume = vi.fn().mockResolvedValue(undefined);
      const realCtx = { state: "suspended", resume } as unknown as AudioContext;
      (globalThis as any).AudioContext = class {
        state = "suspended";
        resume = resume;
      };
      const { audioSystem } = await import("../src/lib/universalAudio");
      (audioSystem as any)._audioCtx = realCtx;

      let threw = false;
      let returned: unknown = undefined;
      try {
        returned = audioSystem.resumeForGesture();
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(false);
      expect(returned).toBe(realCtx);
      expect(resume).toHaveBeenCalled();
      (audioSystem as any)._audioCtx = null;
    });

    it("initializes lazily and returns null without throwing when no ctx exists", async () => {
      mockPlatform.OS = "web";
      (globalThis as any).AudioContext = class {
        state = "running";
        resume = vi.fn();
      };
      const { audioSystem } = await import("../src/lib/universalAudio");
      (audioSystem as any)._audioCtx = null;
      (audioSystem as any).isInitialized = false;

      let threw = false;
      let returned: unknown = undefined;
      try {
        returned = audioSystem.resumeForGesture();
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(false);
      expect(returned).toBeNull();
      (audioSystem as any)._audioCtx = null;
    });

    it("is a no-op returning null on native", async () => {
      mockPlatform.OS = "ios";
      const { audioSystem } = await import("../src/lib/universalAudio");
      expect(audioSystem.resumeForGesture()).toBeNull();
    });
  });

  describe("useWebAudioPlayer.play rejection propagation", () => {
    it("rejects when play() is rejected (does not swallow autoplay error)", async () => {
      mockPlatform.OS = "web";
      const { useWebAudioPlayer } = await import("../src/hooks/useWebAudioPlayer");
      const { result } = renderHook(() => useWebAudioPlayer({ trackTime: false }));
      const audioEl = (result.current.audioRef.current as any) as HTMLAudioElement;
      const err = new Error("play() failed (autoplay)");
      audioEl.play = vi.fn().mockRejectedValue(err);
      await expect(result.current.play()).rejects.toThrow("play() failed (autoplay)");
    });
  });

  describe("preview cache preload", () => {
    it("getCachedPreview returns undefined before preload and a url after", async () => {
      mockPlatform.OS = "web";
      const channels = 1;
      const length = 441;
      const sampleRate = 44100;
      (globalThis as any).OfflineAudioContext = class {
        constructor(_c: number, _l: number, _s: number) {}
        createOscillator() {
          return { connect() {}, frequency: {}, type: "", start() {}, stop() {} };
        }
        createGain() {
          return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } };
        }
        destination = {};
        startRendering() {
          const data = new Float32Array(length);
          return Promise.resolve({
            numberOfChannels: channels,
            sampleRate,
            length,
            getChannelData: () => data,
          });
        }
      };
      (globalThis as any).URL.createObjectURL = vi.fn(() => "blob:cached");
      const { getCachedPreview, preloadPreview } = await import("../src/lib/constants");
      expect(getCachedPreview("p1")).toBeUndefined();
      const url = await preloadPreview("p1", 1);
      expect(url).toBe("blob:cached");
      expect(getCachedPreview("p1")).toBe("blob:cached");
    });
  });
});

describe("web playback freeze avoidance", () => {
  it("playheadStore updates subscribers without exposing setCurrentBeat on tick", async () => {
    const { setPlayheadBeat, getPlayheadBeat, subscribePlayhead } = await import(
      "../src/lib/playheadStore"
    );
    let last = -1;
    const unsub = subscribePlayhead((b) => {
      last = b;
    });
    setPlayheadBeat(3.5);
    expect(getPlayheadBeat()).toBe(3.5);
    expect(last).toBe(3.5);
    setPlayheadBeat(7.25);
    expect(last).toBe(7.25);
    unsub();
    setPlayheadBeat(99);
    expect(last).toBe(7.25);
  });
});
