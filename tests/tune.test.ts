import { describe, it, expect } from "vitest";
import { estimatePitch } from "../src/lib/pitchEstimate";
import { detectKey } from "../src/lib/keyDetection";

function makeSine(
  freq: number,
  sampleRate: number,
  seconds: number,
  amplitude = 0.6,
): Float32Array {
  const length = Math.floor(sampleRate * seconds);
  const frame = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    frame[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return frame;
}

function makeBuffer(
  freq: number,
  sampleRate: number,
  seconds: number,
): AudioBuffer {
  const data = makeSine(freq, sampleRate, seconds);
  return {
    numberOfChannels: 1,
    length: data.length,
    sampleRate,
    duration: seconds,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

describe("pitchEstimate", () => {
  it("estimates 440 Hz sine within tolerance", () => {
    const frame = makeSine(440, 44100, 0.5);
    const pitch = estimatePitch(frame, 44100);
    expect(pitch).not.toBeNull();
    expect(pitch!).toBeGreaterThan(435);
    expect(pitch!).toBeLessThan(445);
  });

  it("estimates 261.63 Hz (C4) sine within tolerance", () => {
    const frame = makeSine(261.63, 44100, 0.5);
    const pitch = estimatePitch(frame, 44100);
    expect(pitch).not.toBeNull();
    expect(pitch!).toBeGreaterThan(257);
    expect(pitch!).toBeLessThan(267);
  });

  it("returns null for silence", () => {
    const frame = new Float32Array(2048).fill(0);
    expect(estimatePitch(frame, 44100)).toBeNull();
  });
});

describe("keyDetection", () => {
  it("detects the key of an A4 mono tone as A", () => {
    const buffer = makeBuffer(440, 44100, 0.6);
    const result = detectKey(buffer);
    expect(result.key).toBe(9);
  });

  it("detects the key of a C4 mono tone as C", () => {
    const buffer = makeBuffer(261.63, 44100, 0.6);
    const result = detectKey(buffer);
    expect(result.key).toBe(0);
  });

  it("returns a valid key and confidence in range", () => {
    const buffer = makeBuffer(330, 44100, 0.6);
    const result = detectKey(buffer);
    expect(result.key).toBeGreaterThanOrEqual(0);
    expect(result.key).toBeLessThan(12);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
