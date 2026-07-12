import { describe, it, expect } from "vitest";
import { measureLUFS, kWeight, truePeak } from "../src/lib/lufs";

const SAMPLE_RATE = 48000;

function generateTone(
  frequency: number,
  durationSec: number,
  amplitude: number,
  phase = 0,
): Float32Array {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amplitude * Math.sin(2 * Math.PI * frequency * (i / SAMPLE_RATE) + phase);
  }
  return out;
}

describe("measureLUFS", () => {
  it("returns -70 floor (absolute gate) for silence", () => {
    const silence: Float32Array[] = [
      new Float32Array(SAMPLE_RATE * 2),
      new Float32Array(SAMPLE_RATE * 2),
    ];
    const result = measureLUFS(silence, SAMPLE_RATE);
    expect(result.integrated).toBe(-70);
    expect(result.truePeak).toBeLessThan(-70);
  });

  it("measures a -14 dBFS (RMS) 1 kHz tone within +/-0.5 of -14 LUFS", () => {
    const amplitude = Math.pow(10, -14 / 20) * Math.SQRT2;
    const tone = generateTone(1000, 3, amplitude);
    const result = measureLUFS([tone, tone], SAMPLE_RATE);
    expect(Math.abs(result.integrated - -14)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(result.shortTerm - -14)).toBeLessThanOrEqual(0.5);
  });

  it("returns a finite short-term reading for a steady tone", () => {
    const tone = generateTone(1000, 3, Math.pow(10, -18 / 20) * Math.SQRT2);
    const result = measureLUFS(tone, SAMPLE_RATE);
    expect(Number.isFinite(result.shortTerm)).toBe(true);
    expect(result.shortTerm).toBeLessThanOrEqual(-10);
    expect(result.shortTerm).toBeGreaterThanOrEqual(-30);
  });

  it("true peak of a full-scale sine is <= 0 dBTP", () => {
    const full = generateTone(1000, 1, 1);
    const tp = truePeak(full, SAMPLE_RATE);
    expect(tp).toBeLessThanOrEqual(0.01);
    expect(tp).toBeGreaterThanOrEqual(-0.5);
  });

  it("oversampling recovers the true peak >= the sample peak (inter-sample)", () => {
    const phase = 0.27;
    const tone = generateTone(1000, 1, 1, phase);
    let samplePeak = 0;
    for (let i = 0; i < tone.length; i++) {
      samplePeak = Math.max(samplePeak, Math.abs(tone[i]));
    }
    const samplePeakDb = 20 * Math.log10(samplePeak);
    const tp = truePeak(tone, SAMPLE_RATE);
    expect(tp).toBeGreaterThanOrEqual(samplePeakDb - 1e-6);
    expect(tp).toBeLessThanOrEqual(0.01);
  });

  it("is a pure function: identical input yields identical output", () => {
    const tone = generateTone(440, 2, 0.5);
    const a = measureLUFS(tone, SAMPLE_RATE);
    const b = measureLUFS(tone, SAMPLE_RATE);
    expect(a).toEqual(b);
  });

  it("kWeight does not blow up on a full-scale signal", () => {
    const tone = generateTone(1000, 0.5, 1);
    const filtered = kWeight(tone, SAMPLE_RATE);
    expect(filtered.length).toBe(tone.length);
    let maxAbs = 0;
    for (let i = 0; i < filtered.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(filtered[i]));
    }
    expect(Number.isFinite(maxAbs)).toBe(true);
    expect(maxAbs).toBeLessThan(50);
  });
});
