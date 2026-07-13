import { describe, it, expect } from "vitest";
import {
  trimRegion,
  splitRegion,
  moveRegion,
  crossfadeGain,
  type EditableRegion,
} from "../src/lib/regionEdit";

const base: EditableRegion = {
  id: "r1",
  start: 2,
  duration: 10,
  url: "blob:test",
  offset: 0,
  length: 10,
};

describe("splitRegion", () => {
  it("splits into two regions whose durations sum to the original", () => {
    const [a, b] = splitRegion(base, 5);
    expect(a.duration + b.duration).toBeCloseTo(base.duration);
    expect(a.start).toBe(2);
    expect(b.start).toBe(5);
  });

  it("computes correct offsets", () => {
    const [a, b] = splitRegion(base, 5);
    expect(a.offset).toBe(0);
    expect(a.length).toBe(3);
    expect(b.offset).toBe(3);
    expect(b.length).toBe(7);
    expect((a.length ?? 0) + (b.length ?? 0)).toBeCloseTo(base.length ?? 0);
  });

  it("shares the source url", () => {
    const [a, b] = splitRegion(base, 5);
    expect(a.url).toBe(base.url);
    expect(b.url).toBe(base.url);
  });
});

describe("trimRegion", () => {
  it("clamps start trim at boundaries (never negative)", () => {
    const r = trimRegion(base, "start", -100, 20);
    expect(r.start).toBeGreaterThanOrEqual(0);
    expect(r.offset ?? 0).toBeGreaterThanOrEqual(0);
    expect(r.duration).toBeGreaterThanOrEqual(0);
  });

  it("clamps end trim at source duration", () => {
    const r = trimRegion(base, "end", 1000, 12);
    expect((r.offset ?? 0) + (r.length ?? 0)).toBeLessThanOrEqual(12 + 1e-9);
    expect(r.duration).toBeGreaterThanOrEqual(0);
  });

  it("trims the start edge inward", () => {
    const r = trimRegion(base, "start", 2, 20);
    expect(r.start).toBe(4);
    expect(r.offset).toBe(2);
    expect(r.duration).toBe(8);
  });
});

describe("moveRegion", () => {
  it("respects start >= 0", () => {
    expect(moveRegion(base, -100).start).toBe(0);
    expect(moveRegion(base, 3).start).toBe(5);
  });
});

describe("crossfadeGain", () => {
  it("produces equal-power gains (squares sum ~1)", () => {
    const [a, b] = crossfadeGain(1, 1);
    expect(a * a + b * b).toBeCloseTo(1);
    const [c, d] = crossfadeGain(3, 1);
    expect(c * c + d * d).toBeCloseTo(1);
  });
});
