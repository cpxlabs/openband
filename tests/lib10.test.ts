import { describe, it, expect } from "vitest";
import {
  clampParam,
  getDefaultParams,
  PLUGIN_SPECS,
  type PluginParamSpec,
} from "../src/lib/types";
import {
  SUBTRACTIVE_PRESETS,
  MAX_VOICES,
  type SubtractiveSynthConfig,
} from "../src/lib/subtractiveSynth";
import {
  PROGRESSION_PRESETS,
  buildVoicing,
  suggestNextChord,
  suggestNextChordSymbol,
  CHORD_VOCABULARY,
} from "../src/lib/chordTrackState";
import { buildPluginGraph } from "../src/lib/pluginChain";
import type { Plugin } from "../src/lib/types";
import { parsePattern } from "../src/lib/codeSampler";

describe("ITEM1 plugin param clamping", () => {
  it("clamps eq gain spec to [min,max]", () => {
    const eqGain = PLUGIN_SPECS.eq.params.find((p) => p.id === "b0_gain") as PluginParamSpec;
    expect(eqGain.min).toBe(-18);
    expect(eqGain.max).toBe(18);
    expect(clampParam(eqGain, 50)).toBe(18);
    expect(clampParam(eqGain, -99)).toBe(-18);
    expect(clampParam(eqGain, 0)).toBe(0);
  });

  it("clamps compressor threshold spec to range", () => {
    const threshold = PLUGIN_SPECS.compressor.params.find(
      (p) => p.id === "threshold",
    ) as PluginParamSpec;
    expect(clampParam(threshold, 1000)).toBe(threshold.max);
    expect(clampParam(threshold, -1000)).toBe(threshold.min);
  });

  it("clamps to [min,max] honoring step", () => {
    const spec: PluginParamSpec = {
      id: "x",
      label: "X",
      min: 0,
      max: 10,
      step: 3,
      default: 0,
    };
    expect(clampParam(spec, 4)).toBe(3);
    expect(clampParam(spec, 7)).toBe(6);
    expect(clampParam(spec, -5)).toBe(0);
    expect(clampParam(spec, 99)).toBe(9);
  });

  it("all 19 plugin types default params within [min,max]", () => {
    const types = Object.keys(PLUGIN_SPECS) as (keyof typeof PLUGIN_SPECS)[];
    expect(types.length).toBe(19);
    for (const type of types) {
      const params = getDefaultParams(type);
      for (const spec of PLUGIN_SPECS[type].params) {
        const v = params[spec.id];
        expect(v).toBeGreaterThanOrEqual(spec.min);
        expect(v).toBeLessThanOrEqual(spec.max);
      }
    }
  });
});

describe("ITEM2 buildPluginGraph series helper", () => {
  const A: Plugin = { id: "A", name: "A", type: "utility", enabled: true, params: {} };
  const B: Plugin = { id: "B", name: "B", type: "utility", enabled: true, params: {} };
  const Boff: Plugin = { id: "B", name: "B", type: "utility", enabled: false, params: {} };

  it("returns plugins in series order", () => {
    expect(buildPluginGraph([A, B]).map((p) => p.id)).toEqual(["A", "B"]);
  });

  it("filters out disabled plugins", () => {
    expect(buildPluginGraph([A, Boff]).map((p) => p.id)).toEqual(["A"]);
  });

  it("preserves given order of reordered input", () => {
    expect(buildPluginGraph([B, A]).map((p) => p.id)).toEqual(["B", "A"]);
  });
});

describe("ITEM3 subtractive synth presets", () => {
  it("has exactly 25 valid presets", () => {
    expect(Object.keys(SUBTRACTIVE_PRESETS).length).toBe(25);
    expect(MAX_VOICES).toBe(16);
    for (const preset of Object.values(SUBTRACTIVE_PRESETS)) {
      const cfg = preset as Partial<SubtractiveSynthConfig>;
      expect(cfg.osc1).toBeDefined();
      expect(cfg.osc2).toBeDefined();
      expect(cfg.filter).toBeDefined();
      expect(cfg.ampEnvelope).toBeDefined();
      expect(cfg.filterEnvelope).toBeDefined();
    }
  });
});

describe("ITEM4 chord track progressions and markov", () => {
  it("has exactly 10 progression presets", () => {
    expect(PROGRESSION_PRESETS.length).toBe(10);
  });

  it("buildVoicing min7 yields 4 midi notes Cm7", () => {
    expect(buildVoicing(0, "min7")).toEqual([60, 63, 67, 70]);
  });

  it("suggestNextChordSymbol returns vocabulary chord for several inputs", () => {
    for (const symbol of ["Am", "G7", "C", "F", "Dm7", "E"]) {
      const next = suggestNextChordSymbol(symbol);
      expect(typeof next).toBe("string");
      expect(next.length).toBeGreaterThan(0);
      expect(CHORD_VOCABULARY).toContain(next);
    }
  });

  it("suggestNextChord returns a valid chord object", () => {
    const inputs = [
      { root: 9, quality: "minor" as const, symbol: "Am", id: "c1", start: 0, duration: 4, key: "C", inversion: 0, velocity: 80, color: "#5ac8fa" },
      { root: 7, quality: "dom7" as const, symbol: "G7", id: "c2", start: 0, duration: 4, key: "C", inversion: 0, velocity: 80, color: "#ff9f0a" },
      { root: 0, quality: "major" as const, symbol: "C", id: "c3", start: 0, duration: 4, key: "C", inversion: 0, velocity: 80, color: "#34c759" },
    ];
    for (const input of inputs) {
      const next = suggestNextChord(input);
      expect(typeof next.root).toBe("number");
      expect(typeof next.quality).toBe("string");
    }
  });
});

describe("ITEM5 code sampler token parse", () => {
  it("parses compact 16-step notation with triggers", () => {
    const { tokens, warnings } = parsePattern("K..S..H....K...");
    expect(tokens.length).toBe(16);
    expect(tokens[0]).toBe("KICK");
    expect(tokens[3]).toBe("SNARE");
    expect(tokens[6]).toBe("HH");
    expect(tokens[11]).toBe("KICK");
    expect(tokens[1]).toBe("REST");
    expect(warnings.length).toBe(0);
  });

  it("warns on invalid char and treats it as silence", () => {
    const { tokens, warnings } = parsePattern("K.XS..H....K...");
    expect(tokens.length).toBe(16);
    expect(tokens[2]).toBe("REST");
    expect(warnings.some((w: string) => w.includes("X"))).toBe(true);
  });

  it("keeps backward-compatible word-based input", () => {
    const { tokens, warnings } = parsePattern("KICK SNARE HH KICK");
    expect(tokens).toEqual(["KICK", "SNARE", "HH", "KICK"]);
    expect(warnings.length).toBe(0);
  });
});
