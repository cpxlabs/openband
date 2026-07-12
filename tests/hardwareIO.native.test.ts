import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPlatform = { OS: "ios" as string };
vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS;
    },
  },
}));

const bridge = {
  enumerateAudioDevices: vi.fn(),
  openHardwareInput: vi.fn().mockResolvedValue(true),
  closeHardwareInput: vi.fn().mockResolvedValue(undefined),
  createPatchRoute: vi.fn().mockResolvedValue(undefined),
  removePatchRoute: vi.fn().mockResolvedValue(undefined),
  getPatchRoutes: vi.fn().mockResolvedValue([]),
};

vi.mock("@bridge", () => ({
  OpenBandNative: bridge,
}));

const nativeInput = {
  id: "hw-in-1",
  kind: "audioinput" as const,
  label: "Scarlett 18i20",
  groupId: "grp-1",
  sampleRates: [48000],
  channelCounts: [18],
  latency: 0.003,
};

describe("hardwareIO native bridge fast path", () => {
  beforeEach(() => {
    mockPlatform.OS = "ios";
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("enumerateAudioDevices delegates to the native bridge", async () => {
    bridge.enumerateAudioDevices.mockResolvedValue({
      inputs: [nativeInput],
      outputs: [],
    });
    const mod = await import("../src/lib/hardwareIO");
    const { inputs } = await mod.enumerateAudioDevices();
    expect(bridge.enumerateAudioDevices).toHaveBeenCalledTimes(1);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].label).toBe("Scarlett 18i20");
    expect(mod.getHardwareChannels("hw-in-1", 2)).toHaveLength(2);
  });

  it("createPatchRoute persists via the native bridge", async () => {
    const mod = await import("../src/lib/hardwareIO");
    const route = mod.createPatchRoute(
      {
        deviceId: "hw-in-1",
        channelIndex: 0,
        label: "Scarlett Ch 1",
        sampleRate: 48000,
      },
      "track-1",
    );
    expect(bridge.createPatchRoute).toHaveBeenCalledTimes(1);
    expect(bridge.createPatchRoute).toHaveBeenCalledWith(
      expect.objectContaining({ id: route.id, targetTrackId: "track-1" }),
    );
  });

  it("removePatchRoute delegates to the native bridge", async () => {
    const mod = await import("../src/lib/hardwareIO");
    mod.removePatchRoute("route-x");
    expect(bridge.removePatchRoute).toHaveBeenCalledWith("route-x");
  });

  it("openHardwareInput / closeHardwareInput delegate to the native bridge", async () => {
    const mod = await import("../src/lib/hardwareIO");
    const stream = await mod.openHardwareInput("hw-in-1", 2, 48000);
    expect(stream).toBeNull();
    expect(bridge.openHardwareInput).toHaveBeenCalledWith("hw-in-1", 2, 48000);
    mod.closeHardwareInput();
    expect(bridge.closeHardwareInput).toHaveBeenCalledTimes(1);
  });
});
