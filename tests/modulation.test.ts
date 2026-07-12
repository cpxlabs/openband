import { describe, it, expect } from "vitest";
import {
  setModulationState,
  addModRoute,
  applyModulation,
  computeModulation,
  paramToTarget,
} from "../src/lib/modulationMatrix";

describe("modulationMatrix", () => {
  it("paramToTarget maps plugin param ids to modulation targets", () => {
    expect(paramToTarget("cutoff")).toBe("filter.cutoff");
    expect(paramToTarget("freq")).toBe("filter.cutoff");
    expect(paramToTarget("resonance")).toBe("filter.resonance");
    expect(paramToTarget("gain")).toBe("amp.gain");
    expect(paramToTarget("volume")).toBe("volume");
    expect(paramToTarget("detune")).toBe("osc1.detune");
    expect(paramToTarget("pan")).toBe("pan.position");
    expect(paramToTarget("width")).toBe("pan.position");
    expect(paramToTarget("bogus")).toBeNull();
  });

  it("bakes LFO modulation that varies over time", () => {
    setModulationState({ routes: [] });
    addModRoute("lfo1", "filter.cutoff", 0.5, false);
    const at0 = applyModulation("filter.cutoff", 1000, 20, 20000, { time: 0 });
    const at25 = applyModulation("filter.cutoff", 1000, 20, 20000, { time: 0.25 });
    expect(at0).not.toBe(at25);
  });

  it("computeModulation returns 0 for an unknown target", () => {
    expect(computeModulation("volume", { time: 0 })).toBe(0);
  });
});
