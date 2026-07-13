import { describe, it, expect } from "vitest";
import { INSTRUMENT_PRESETS } from "../src/lib/wasmInstrumentEngine";

describe("INSTRUMENT_PRESETS", () => {
  it("includes the Orchestral instrument pack preset", () => {
    const names = INSTRUMENT_PRESETS.map((p) => p.name);
    expect(names).toContain("Orchestral");

    const orchestral = INSTRUMENT_PRESETS.find((p) => p.name === "Orchestral")!;
    expect(orchestral.osc1Type).toBe("sawtooth");
    expect(orchestral.osc2Type).toBe("triangle");
    expect(orchestral.voices).toBeGreaterThan(0);
    expect(orchestral.ampAttack).toBeGreaterThan(0);
  });

  it("keeps every preset a valid InstrumentPreset shape", () => {
    for (const p of INSTRUMENT_PRESETS) {
      expect(typeof p.name).toBe("string");
      expect(p.filterCutoff).toBeGreaterThan(0);
      expect(p.volume).toBeGreaterThan(0);
    }
  });
});
