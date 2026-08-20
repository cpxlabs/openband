import { describe, it, expect } from "vitest";
import {
  generateArrangement,
  selectRepresentativeWindows,
  pickHighEnergy,
  pickContrast,
  clampWindowToContent,
  arrangementCacheKey,
  isRenderCacheValid,
  shouldRenderFullArrangement,
  type EnergySection,
} from "../src/lib/arrangementGenerator";

function sec(name: string, startBar: number, endBar: number, energy: 1 | 2 | 3 | 4 | 5): EnergySection {
  return { name, label: name, startBar, endBar, energy, description: "" };
}

const sections: EnergySection[] = [
  sec("a", 0, 8, 1),
  sec("b", 8, 16, 5),
  sec("c", 16, 24, 2),
  sec("d", 24, 32, 4),
];

describe("V10 Section E — Arrangement Preview", () => {
  it("E35 — known subgenre returns non-empty arrangement with energy 1..5", () => {
    const known = "trap";
    const arr = generateArrangement(known);
    expect(arr.length).toBeGreaterThan(0);
    for (const s of arr) {
      expect(s.energy).toBeGreaterThanOrEqual(1);
      expect(s.energy).toBeLessThanOrEqual(5);
    }
  });

  it("E36 — selector returns no more than maxWindows", () => {
    const w = selectRepresentativeWindows(sections, { maxWindows: 3, previewBudgetBars: 100 });
    expect(w.length).toBeLessThanOrEqual(3);
  });

  it("E37 — returned windows stay within preview budget", () => {
    const w = selectRepresentativeWindows(sections, { maxWindows: 3, previewBudgetBars: 100 });
    const sum = w.reduce((acc, x) => acc + x.bars, 0);
    expect(sum).toBeLessThanOrEqual(100);
  });

  it("E38 — high-energy section selected when available", () => {
    const w = selectRepresentativeWindows(sections, { maxWindows: 3, previewBudgetBars: 100 });
    const hasHigh = w.some((x) => {
      const s = sections[x.sectionIndex];
      return s && s.energy >= 4;
    });
    expect(hasHigh).toBe(true);
  });

  it("E39 — contrast section or low/medium energy section selected", () => {
    const contrast = pickContrast(sections, 1);
    expect(contrast.length).toBe(1);
    expect(pickHighEnergy(sections, 1)[0].energy).toBe(5);
    const w = selectRepresentativeWindows(sections, { maxWindows: 3, previewBudgetBars: 100 });
    const hasLowOrMedium = w.some((x) => {
      const s = sections[x.sectionIndex];
      return s && s.energy <= 2;
    });
    expect(hasLowOrMedium).toBe(true);
  });

  it("E40 — empty arrangement fallback returns one short window", () => {
    const w = selectRepresentativeWindows([], { maxWindows: 3, previewBudgetBars: 16 });
    expect(w.length).toBe(1);
    expect(w[0].bars).toBeLessThanOrEqual(16);
    expect(w[0].startBar).toBe(0);
  });

  it("E41 — manual window clamped to content", () => {
    const w = clampWindowToContent({ sectionIndex: 2, startBar: 10, endBar: 999, bars: 0 }, 40);
    expect(w.endBar).toBe(40);
    expect(w.bars).toBe(30);
  });

  it("E42 — cache invalidates on bpm/key change", () => {
    const k = arrangementCacheKey("trap", 120, "C");
    expect(isRenderCacheValid(k, { bpm: 120, key: "C" })).toBe(true);
    expect(isRenderCacheValid(k, { bpm: 140, key: "C" })).toBe(false);
    expect(isRenderCacheValid(k, { bpm: 120, key: "G" })).toBe(false);
  });

  it("E43 — shouldRenderFullArrangement thresholds", () => {
    expect(shouldRenderFullArrangement(64)).toBe(false);
    expect(shouldRenderFullArrangement(112)).toBe(false);
    expect(shouldRenderFullArrangement(8)).toBe(true);
  });

  it("E44 — window boundaries clamped to content", () => {
    const w1 = clampWindowToContent({ sectionIndex: 0, startBar: -5, endBar: 999, bars: 0 }, 32);
    expect(w1.startBar).toBeGreaterThanOrEqual(0);
    expect(w1.endBar).toBe(32);
    expect(w1.bars).toBe(32);

    const w2 = clampWindowToContent({ sectionIndex: 0, startBar: 20, endBar: 10, bars: 0 }, 32);
    expect(w2.endBar).toBeGreaterThanOrEqual(w2.startBar);
    expect(w2.endBar).toBeLessThanOrEqual(32);
  });
});
