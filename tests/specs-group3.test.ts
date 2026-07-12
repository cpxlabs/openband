import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web", select: (obj: any) => obj.web ?? obj.default },
}));

import * as hw from "../src/lib/hardwareIO";
import * as wasm from "../src/lib/wasmPluginHost";
import { INSTRUMENT_PRESETS, createUnifiedInstrumentEngine } from "../src/lib/wasmInstrumentEngine";

function makeChannel(deviceId: string, channelIndex = 0): hw.HardwareChannel {
  return { deviceId, channelIndex, label: `${deviceId} Ch ${channelIndex + 1}`, sampleRate: 44100 };
}

describe("hardware-io: patch route CRUD", () => {
  beforeEach(() => {
    hw.clearAllRoutes();
  });

  it("createPatchRoute appends an enabled route", () => {
    const ch = makeChannel("dev-1");
    const route = hw.createPatchRoute(ch, "track-9", 1, 0.8);
    expect(route.enabled).toBe(true);
    expect(route.targetTrackId).toBe("track-9");
    expect(route.targetChannel).toBe(1);
    expect(route.gain).toBe(0.8);
    expect(hw.getRoutesForTrack("track-9")).toHaveLength(1);
  });

  it("removePatchRoute deletes a route by id", () => {
    const ch = makeChannel("dev-1");
    const route = hw.createPatchRoute(ch, "track-1");
    expect(hw.getPatchbayState().routes).toHaveLength(1);
    hw.removePatchRoute(route.id);
    expect(hw.getPatchbayState().routes).toHaveLength(0);
  });

  it("getRoutesFromDevice filters by source device id", () => {
    hw.createPatchRoute(makeChannel("dev-a"), "t1");
    hw.createPatchRoute(makeChannel("dev-b"), "t2");
    expect(hw.getRoutesFromDevice("dev-a")).toHaveLength(1);
    expect(hw.getRoutesFromDevice("dev-b")).toHaveLength(1);
    expect(hw.getRoutesFromDevice("dev-missing")).toHaveLength(0);
  });

  it("getHardwareChannels returns empty for unknown device", () => {
    expect(hw.getHardwareChannels("nope")).toEqual([]);
  });
});

describe("hardware-io: native no-op behavior", () => {
  it("enumerateAudioDevices returns empty when navigator is undefined", async () => {
    const original = (globalThis as any).navigator;
    (globalThis as any).navigator = undefined;
    const result = await hw.enumerateAudioDevices();
    (globalThis as any).navigator = original;
    expect(result).toEqual({ inputs: [], outputs: [] });
  });

  it("setAudioOutputDevice returns false on non-web platform", async () => {
    vi.resetModules();
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios", select: (obj: any) => obj.ios ?? obj.default },
    }));
    const nativeHw = await vi.importActual<typeof hw>("../src/lib/hardwareIO");
    expect(await nativeHw.setAudioOutputDevice("out-1")).toBe(false);
    vi.doUnmock("react-native");
  });
});

describe("wasm-plugins: descriptor parsing & UI", () => {
  it("parsePluginSchema fills defaults for missing fields", () => {
    const d = wasm.parsePluginSchema(JSON.stringify({ id: "x", name: "X" }));
    expect(d.id).toBe("x");
    expect(d.name).toBe("X");
    expect(d.version).toBe("1.0.0");
    expect(d.inputChannels).toBe(2);
    expect(d.outputChannels).toBe(2);
    expect(d.category).toBe("Effect");
    expect(d.parameters).toEqual([]);
  });

  it("parsePluginSchema preserves provided params & channels", () => {
    const d = wasm.parsePluginSchema(
      JSON.stringify({
        id: "d",
        name: "D",
        inputChannels: 4,
        outputChannels: 4,
        parameters: [{ id: "p1", name: "Gain", type: "float", min: 0, max: 1, default: 0.5 }],
      }),
    );
    expect(d.inputChannels).toBe(4);
    expect(d.parameters).toHaveLength(1);
    expect(d.parameters[0].default).toBe(0.5);
  });

  it("createGenericPluginUI groups params and carries state", () => {
    const descriptor: wasm.PluginDescriptor = {
      id: "d",
      name: "D",
      version: "1.0.0",
      author: "t",
      category: "Effect",
      inputChannels: 2,
      outputChannels: 2,
      parameters: [
        { id: "a", name: "A", type: "float", min: 0, max: 1, default: 0, group: "G1" },
        { id: "b", name: "B", type: "float", min: 0, max: 1, default: 0, group: "G2" },
      ],
    };
    let captured = "";
    const ui = wasm.createGenericPluginUI(descriptor, { a: 0.3, b: 0.7 }, (id) => (captured = id));
    expect(ui.groups.get("G1")?.map((p) => p.id)).toEqual(["a"]);
    expect(ui.groups.get("G2")?.map((p) => p.id)).toEqual(["b"]);
    expect(ui.paramValues).toEqual({ a: 0.3, b: 0.7 });
    ui.onParamChange("a", 0.5);
    expect(captured).toBe("a");
  });
});

describe("wasm-plugins: unified instrument engine", () => {
  it("defaults to INSTRUMENT_PRESETS[0]", () => {
    expect(Array.isArray(INSTRUMENT_PRESETS)).toBe(true);
    expect(INSTRUMENT_PRESETS.length).toBeGreaterThan(0);
    const engine = createUnifiedInstrumentEngine();
    expect(engine.getPreset()).toEqual(INSTRUMENT_PRESETS[0]);
  });

  it("render produces zeros with no active voices", () => {
    const engine = createUnifiedInstrumentEngine();
    const buf = new Float32Array(64);
    engine.render(buf, 64);
    expect(Array.from(buf).every((v) => v === 0)).toBe(true);
  });

  it("noteOn then render produces non-zero output", () => {
    const engine = createUnifiedInstrumentEngine();
    engine.noteOn(60, 100);
    const buf = new Float32Array(64);
    engine.render(buf, 64);
    expect(Array.from(buf).some((v) => v !== 0)).toBe(true);
    engine.noteOff(60);
    const buf2 = new Float32Array(64);
    engine.render(buf2, 64);
    expect(Array.from(buf2).every((v) => v === 0)).toBe(true);
  });
});
