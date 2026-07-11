import { describe, it, expect } from "vitest";
import { PLUGIN_SPECS, getDefaultParams } from "../../src/lib/types";
import {
  serializePlugin,
  deserializePlugin,
  applyPluginSlot,
  storePluginSlot,
  getChainLatency,
} from "../../src/lib/pluginChain";

const PLUGIN_TYPES = Object.keys(PLUGIN_SPECS) as (keyof typeof PLUGIN_SPECS)[];

describe("Default preset per type", () => {
  it("every type has a Default preset equal to defaults", () => {
    for (const type of PLUGIN_TYPES) {
      const spec = PLUGIN_SPECS[type];
      const def = spec.presets.find((p) => p.name === "Default");
      expect(def, `missing Default preset for ${type}`).toBeDefined();
      const defaults = getDefaultParams(type as any);
      for (const p of spec.params) {
        expect(def!.values[p.id]).toBe(defaults[p.id]);
      }
    }
  });
});

describe("plugin serialization round-trip", () => {
  const plugin = {
    id: "p1",
    name: "My Reverb",
    type: "reverb" as const,
    enabled: true,
    params: { decay: 2.1, preDelay: 20, damping: 40, size: 60, mix: 40, shimmerPitch: 0, modulation: 0 },
    color: "#64d2ff",
  };

  it("deep-equals original after round trip", () => {
    const round = deserializePlugin(serializePlugin(plugin as any));
    expect(round).toEqual(plugin);
  });

  it("clamps out-of-range params on deserialize", () => {
    const bad = JSON.stringify({
      id: "p2",
      name: "Bad",
      type: "reverb",
      enabled: true,
      params: { mix: 999 },
    });
    const out = deserializePlugin(bad);
    const spec = PLUGIN_SPECS.reverb.params.find((p) => p.id === "mix")!;
    expect(out.params.mix).toBe(spec.max);
  });
});

describe("per-plugin A/B", () => {
  it("stores A then B and applies slot", () => {
    const base = {
      id: "p",
      name: "X",
      type: "reverb" as const,
      enabled: true,
      params: { mix: 10 },
    };
    const storedA = storePluginSlot(base, "A");
    expect(storedA.activeSlot).toBe("A");
    expect(storedA.stateA).toEqual({ mix: 10 });

    const changed = { ...storedA, params: { mix: 90 } };
    const storedB = storePluginSlot(changed, "B");
    expect(storedB.stateB).toEqual({ mix: 90 });

    const appliedA = applyPluginSlot({ ...storedB, activeSlot: "A" });
    expect(appliedA.params).toEqual({ mix: 10 });

    const appliedB = applyPluginSlot({ ...storedB, activeSlot: "B" });
    expect(appliedB.params).toEqual({ mix: 90 });
  });
});

describe("getChainLatency", () => {
  it("sums enabled latency and excludes disabled", () => {
    const reverb: any = { id: "r", name: "R", type: "reverb", enabled: true, params: {} };
    const limiter: any = { id: "t", name: "T", type: "truePeakLimiter", enabled: true, params: {} };
    const disabled: any = { id: "d", name: "D", type: "reverb", enabled: false, params: {} };
    expect(getChainLatency([reverb, limiter])).toBe(1200 + 256);
    expect(getChainLatency([reverb, limiter, disabled])).toBe(1200 + 256);
  });
});
