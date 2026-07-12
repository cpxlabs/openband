import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

const nativeBridgeMock = {
  enumerateAudioDevices: vi.fn().mockResolvedValue({
    inputs: [
      {
        id: "in1",
        kind: "audioinput",
        label: "In 1",
        groupId: "g",
        sampleRates: [44100],
        channelCounts: [2],
        latency: 0,
      },
    ],
    outputs: [],
  }),
  createPatchRoute: vi.fn().mockResolvedValue(undefined),
  removePatchRoute: vi.fn().mockResolvedValue(undefined),
  getPatchRoutes: vi.fn().mockResolvedValue([]),
  openHardwareInput: vi.fn().mockResolvedValue(true),
  closeHardwareInput: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../src/bridge", () => ({
  OpenBandNative: nativeBridgeMock,
}));

describe("hardwareIO native delegation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("enumerateAudioDevices delegates to OpenBandNative off-web", async () => {
    const { enumerateAudioDevices } = await import("../src/lib/hardwareIO");
    const res = await enumerateAudioDevices();
    expect(nativeBridgeMock.enumerateAudioDevices).toHaveBeenCalled();
    expect(res.inputs.length).toBe(1);
  });

  it("createPatchRoute persists through OpenBandNative off-web", async () => {
    const { createPatchRoute } = await import("../src/lib/hardwareIO");
    createPatchRoute(
      { deviceId: "in1", channelIndex: 0, label: "ch", sampleRate: 44100 },
      "track1",
      0,
      1,
    );
    expect(nativeBridgeMock.createPatchRoute).toHaveBeenCalled();
  });
});
