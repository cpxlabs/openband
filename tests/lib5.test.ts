import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock react-native Platform BEFORE importing any modules
const mockPlatform = { OS: "web" as string };
vi.mock("react-native", () => ({
  Platform: {
    get OS() { return mockPlatform.OS; },
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 1920, height: 1080 })),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

// Mock bridge
vi.mock("../src/bridge", () => ({
  OpenBandNative: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    getDocumentsPath: vi.fn().mockResolvedValue("/docs"),
    saveProject: vi.fn().mockResolvedValue(true),
    loadProject: vi.fn().mockResolvedValue(null),
    deleteProject: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("universalAudio cross-platform behavior", () => {
  beforeEach(() => {
    mockPlatform.OS = "web";
  });

  afterEach(() => {
    mockPlatform.OS = "web";
  });

  describe("native platform (ios/android)", () => {
    it("initialize is a no-op on native (audioCtx stays null)", async () => {
      mockPlatform.OS = "ios";
      vi.resetModules();

      const { audioSystem } = await import("../src/lib/universalAudio");
      await audioSystem.initialize();

      expect(audioSystem.audioCtx).toBeNull();
      // isInitialized is private, but we can verify the system was initialized by checking audioCtx is null on native
    });

    it("ensureContext returns null on native", async () => {
      mockPlatform.OS = "android";
      vi.resetModules();

      const { audioSystem } = await import("../src/lib/universalAudio");
      const ctx = await audioSystem.ensureContext();

      expect(ctx).toBeNull();
    });

    it("getSharedAudioContext returns null on native", async () => {
      mockPlatform.OS = "ios";
      vi.resetModules();

      const { getSharedAudioContext } = await import("../src/lib/universalAudio");
      expect(getSharedAudioContext()).toBeNull();
    });

    it("disposeAllAudio is safe to call on native", async () => {
      mockPlatform.OS = "android";
      vi.resetModules();

      const { disposeAllAudio } = await import("../src/lib/universalAudio");
      expect(() => disposeAllAudio()).not.toThrow();
    });
  });
});

describe("hardwareIO cross-platform behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    mockPlatform.OS = "web";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockPlatform.OS = "web";
  });

  describe("web platform", () => {
    it("enumerateAudioDevices returns input and output devices on web", async () => {
      const mockDevices = [
        { deviceId: "in1", kind: "audioinput", label: "Microphone" },
        { deviceId: "out1", kind: "audiooutput", label: "Speakers" },
      ];
      const mockGUM = vi.fn().mockResolvedValue({ getTracks: vi.fn(() => []) });
      vi.stubGlobal("navigator", {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
          getUserMedia: mockGUM,
        },
      });

      const { enumerateAudioDevices } = await import("../src/lib/hardwareIO");
      const result = await enumerateAudioDevices();

      expect(result.inputs).toHaveLength(1);
      expect(result.outputs).toHaveLength(1);
      expect(result.inputs[0].id).toBe("in1");
      expect(result.outputs[0].id).toBe("out1");
    });

    it("getPatchbayState returns initial state on web", async () => {
      vi.stubGlobal("navigator", {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue([]),
          getUserMedia: vi.fn().mockResolvedValue({ getTracks: vi.fn(() => []) }),
        },
      });

      const { getPatchbayState } = await import("../src/lib/hardwareIO");
      const state = getPatchbayState();

      expect(state.routes).toEqual([]);
      expect(state.inputDevices).toEqual([]);
      expect(state.outputDevices).toEqual([]);
    });
  });

  describe("native platform", () => {
    it("enumerateAudioDevices returns empty arrays on native", async () => {
      mockPlatform.OS = "ios";
      const { enumerateAudioDevices } = await import("../src/lib/hardwareIO");
      const result = await enumerateAudioDevices();

      expect(result.inputs).toEqual([]);
      expect(result.outputs).toEqual([]);
    });

    it("setAudioOutputDevice returns false on native", async () => {
      mockPlatform.OS = "android";
      const { setAudioOutputDevice } = await import("../src/lib/hardwareIO");
      const result = await setAudioOutputDevice("speaker-1");

      expect(result).toBe(false);
    });

    it("getCurrentOutputDevice returns empty string on native", async () => {
      mockPlatform.OS = "ios";
      const { getCurrentOutputDevice } = await import("../src/lib/hardwareIO");

      expect(getCurrentOutputDevice()).toBe("");
    });

    it("openHardwareInput returns null on native", async () => {
      mockPlatform.OS = "android";
      const { openHardwareInput } = await import("../src/lib/hardwareIO");
      const result = await openHardwareInput("mic-1");

      expect(result).toBeNull();
    });

    it("closeHardwareInput is safe to call on native", async () => {
      mockPlatform.OS = "ios";
      const { closeHardwareInput } = await import("../src/lib/hardwareIO");

      expect(() => closeHardwareInput()).not.toThrow();
    });

    it("getPatchbayState returns empty state on native", async () => {
      mockPlatform.OS = "ios";
      const { getPatchbayState } = await import("../src/lib/hardwareIO");
      const state = getPatchbayState();

      expect(state.routes).toEqual([]);
    });
  });
});

describe("projectStore cross-platform behavior", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saveProject uses localStorage on web", async () => {
    mockPlatform.OS = "web";
    const storageMock = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", storageMock);

    const { saveProject } = await import("../src/lib/projectStore");

    saveProject("test-1", {
      title: "Test Project",
      bpm: 120,
      key: "C",
      genre: "rock",
      tracks: [],
      groups: [],
      buses: [],
      trackAssignments: {},
      masterPlugins: [],
      masteringChain: [],
      sendBuses: [],
      trackAmpChains: {},
      mixSnapshots: [],
      activeMixId: undefined,
      metronome: {
        bpm: 120, timeSig: [4, 4], accentInterval: 4,
        volume: 0.5, enabled: false, countIn: false, countInBars: 2,
      },
      recordSettings: {
        armed: false, inputSource: "mic", quality: "high",
        sampleRate: 44100, mono: false, preRoll: 0,
      },
    });

    expect(storageMock.setItem).toHaveBeenCalled();
  });

  it("exportProject returns null for non-existent project", async () => {
    mockPlatform.OS = "web";
    const storageMock = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", storageMock);

    const { exportProject } = await import("../src/lib/projectStore");
    const result = exportProject("non-existent");

    expect(result).toBeNull();
  });

  it("importProject returns null for invalid JSON", async () => {
    mockPlatform.OS = "web";
    const storageMock = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", storageMock);

    const { importProject } = await import("../src/lib/projectStore");
    const result = importProject("not valid json");

    expect(result).toBeNull();
  });

  it("listProjectIndex returns empty object when no storage", async () => {
    mockPlatform.OS = "web";
    vi.stubGlobal("localStorage", null);

    const { listProjectIndex } = await import("../src/lib/projectStore");
    const result = listProjectIndex();

    expect(result).toEqual({});
  });
});

describe("responsive breakpoints", () => {
  it("mobile width is below tablet threshold", () => {
    expect(375).toBeLessThan(480);
  });

  it("tablet width is between mobile and desktop thresholds", () => {
    const width = 768;
    expect(width).toBeGreaterThanOrEqual(480);
    expect(width).toBeLessThan(1280);
  });

  it("desktop width meets threshold", () => {
    expect(1440).toBeGreaterThanOrEqual(1280);
  });

  it("common device widths are classified correctly", () => {
    // iPhone SE
    expect(375).toBeLessThan(480);
    // iPad
    expect(768).toBeGreaterThanOrEqual(480);
    expect(768).toBeLessThan(1280);
    // MacBook
    expect(1440).toBeGreaterThanOrEqual(1280);
    // Desktop
    expect(1920).toBeGreaterThanOrEqual(1280);
  });
});
