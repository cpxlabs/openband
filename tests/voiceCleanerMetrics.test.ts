import { describe, it, expect } from "vitest";
import { measureRMS, measureSNR } from "../src/lib/plugins/voiceCleaner";

describe("measureRMS", () => {
  it("returns 0 for empty input", () => {
    expect(measureRMS([])).toBe(0);
  });

  it("returns 1 for [1, -1]", () => {
    expect(measureRMS([1, -1])).toBe(1);
  });

  it("returns 0.5 for [0.5, 0.5]", () => {
    expect(measureRMS([0.5, 0.5])).toBeCloseTo(0.5, 9);
  });

  it("clamps to 1 for out-of-range input", () => {
    expect(measureRMS([2, 2])).toBe(1);
  });
});

describe("measureSNR", () => {
  it("returns Infinity for identical buffers", () => {
    const identical = new Float32Array([0.1, -0.2, 0.3, -0.4]);
    expect(measureSNR(identical, identical)).toBe(Infinity);
  });

  it("returns 0 when the reference signal has no energy", () => {
    const silentRef = new Float32Array([0, 0, 0]);
    const processed = new Float32Array([0.1, -0.1, 0.05]);
    expect(measureSNR(silentRef, processed)).toBe(0);
  });

  it("holds or increases SNR after a denoise pass", () => {
    const n = 1000;
    const clean = new Float32Array(n);
    const noise = new Float32Array(n);
    const noisy = new Float32Array(n);
    const cleaned = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = ((Math.sin(i * 12.9898) * 43758.5453) % 1);
      clean[i] = Math.sin((i / n) * Math.PI * 2 * 8);
      noise[i] = r * 0.2;
      noisy[i] = clean[i] + noise[i];
      cleaned[i] = clean[i] + noise[i] * 0.3;
    }
    expect(measureSNR(clean, cleaned)).toBeGreaterThanOrEqual(
      measureSNR(clean, noisy),
    );
  });
});
