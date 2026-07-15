import { describe, it, expect, beforeEach } from "vitest";
import {
  setModulationState,
  addModRoute,
  getModSources,
  getModTargets,
  computeModulation,
  applyModulation,
  computeModulatedParams,
  getModulatedValue,
  type ModulatedParamInput,
} from "../src/lib/modulationMatrix";

beforeEach(() => {
  setModulationState({ routes: [] });
});

describe("modulationMatrix sources & targets", () => {
  it("getModSources returns exactly 11 entries", () => {
    expect(getModSources()).toHaveLength(11);
  });

  it("getModTargets returns exactly 11 entries", () => {
    expect(getModTargets()).toHaveLength(11);
  });

  it("entries are unique", () => {
    expect(new Set(getModSources()).size).toBe(11);
    expect(new Set(getModTargets()).size).toBe(11);
  });
});

describe("computeModulation clamping", () => {
  it("returns 0 for a target with no routes", () => {
    expect(computeModulation("volume", { time: 0 })).toBe(0);
  });

  it("scales a macro route into [-1, 1]", () => {
    addModRoute("macro1", "volume", 0.5, false);
    const value = computeModulation("volume", { time: 0 });
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);
  });

  it("never exceeds [-1, 1] even with many stacked routes", () => {
    for (let i = 0; i < 50; i++) {
      addModRoute("lfo1", "filter.cutoff", 1, false);
    }
    const value = computeModulation("filter.cutoff", { time: 0.13 });
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe("applyModulation clamping", () => {
  it("offsets a base value into [min, max]", () => {
    addModRoute("macro1", "volume", 1, false);
    const result = applyModulation("volume", 0, -24, 24, { time: 0 });
    expect(result).toBe(24);
  });

  it("clamps above max", () => {
    addModRoute("macro1", "volume", 1, false);
    const result = applyModulation("volume", 100, -24, 24, { time: 0 });
    expect(result).toBe(24);
  });

  it("clamps below min", () => {
    addModRoute("macro1", "volume", 1, true);
    const result = applyModulation("volume", -100, -24, 24, { time: 0 });
    expect(result).toBe(-24);
  });
});

describe("computeModulatedParams", () => {
  it("returns base for params without a mod target when no route", () => {
    const inputs: ModulatedParamInput[] = [
      { paramId: "gain", base: 2, min: 0, max: 4, target: "amp.gain" },
      { paramId: "dry", base: 9, min: 0, max: 10, target: null },
    ];
    const out = computeModulatedParams(inputs, 0);
    expect(out.gain).toBe(2);
    expect(out.dry).toBe(9);
  });

  it("modulates a routed param at the given transport time", () => {
    addModRoute("macro1", "amp.gain", 1, false);
    const inputs: ModulatedParamInput[] = [
      { paramId: "gain", base: 0, min: 0, max: 4, target: "amp.gain" },
    ];
    const out = computeModulatedParams(inputs, 0.42);
    expect(out.gain).toBeGreaterThanOrEqual(0);
    expect(out.gain).toBeLessThanOrEqual(4);
  });
});

describe("getModulatedValue", () => {
  it("clamps into [min, max] over a range of times", () => {
    addModRoute("lfo1", "filter.cutoff", 1, true);
    for (let t = 0; t < 2; t += 0.05) {
      const v = getModulatedValue("filter.cutoff", 1000, 20, 20000, t);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(20000);
    }
  });
});
