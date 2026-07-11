import { describe, it, expect } from "vitest";
import {
  MASTERING_CHAIN_PRESETS,
  buildMasteringChain,
  validateMasteringChain,
} from "../src/lib/mastering";
import type { Plugin } from "../src/lib/types";

function plugin(type: string): Plugin {
  return { id: type, name: type, type: type as any, enabled: true, params: {} };
}

describe("validateMasteringChain", () => {
  it("accepts a normal chain", () => {
    const chain = [plugin("eq"), plugin("compressor"), plugin("truePeakLimiter")];
    expect(validateMasteringChain(chain).valid).toBe(true);
  });

  it("rejects duplicate terminal limiter", () => {
    const chain = [plugin("eq"), plugin("limiter"), plugin("truePeakLimiter")];
    const res = validateMasteringChain(chain);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("limiter");
  });

  it("accepts a preset (MasteringChainPreset)", () => {
    const preset = MASTERING_CHAIN_PRESETS.find((p) => p.name === "Master Rápido")!;
    expect(validateMasteringChain(preset).valid).toBe(true);
  });
});

describe("mastering preset fixes", () => {
  for (const name of ["Loudness Maximizer", "EDM Club", "Lo-Fi Vibe"]) {
    it(`"${name}" ends with single truePeakLimiter`, () => {
      const preset = MASTERING_CHAIN_PRESETS.find((p) => p.name === name)!;
      const last = preset.plugins[preset.plugins.length - 1];
      const secondLast = preset.plugins[preset.plugins.length - 2];
      expect(last.type).toBe("truePeakLimiter");
      expect(secondLast.type).not.toBe("limiter");
    });
  }

  it("all presets build valid Plugin[] of matching length", () => {
    for (const preset of MASTERING_CHAIN_PRESETS) {
      const chain = buildMasteringChain(preset);
      expect(chain.length).toBe(preset.plugins.length);
      expect(chain.every((p) => p.enabled === true)).toBe(true);
    }
  });
});
