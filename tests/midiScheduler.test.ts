import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeCtx = vi.hoisted(() => {
  let startCount = 0;
  const make = () => ({
    start: () => {
      startCount++;
    },
    stop: () => {},
    connect: () => {},
    frequency: { setValueAtTime: () => {} },
    type: "",
    Q: { setValueAtTime: () => {} },
    gain: {
      value: 0,
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    },
  });
  return {
    createOscillator: () => make(),
    createBiquadFilter: () => make(),
    createGain: () => make(),
    destination: {},
    currentTime: 0,
    getStartCount: () => startCount,
    reset: () => {
      startCount = 0;
    },
  };
});

vi.mock("../src/lib/universalAudio", () => ({
  getSharedAudioContext: () => fakeCtx,
}));

import { createLookaheadScheduler } from "../src/lib/midiScheduler";

describe("midiScheduler H1 double-schedule", () => {
  beforeEach(() => {
    fakeCtx.reset();
    vi.useFakeTimers();
  });

  it("schedules a long note exactly once across ticks (no stacked voices)", () => {
    const sched = createLookaheadScheduler();
    const longNote = { pitch: 60, velocity: 100, start: 0, duration: 4 };
    const shortNote = { pitch: 64, velocity: 100, start: 1, duration: 0.1 };
    sched.start([longNote, shortNote], 120, 0);

    vi.advanceTimersByTime(2500);

    expect(fakeCtx.getStartCount()).toBe(2);
    sched.stop();
    vi.useRealTimers();
  });

  it("re-schedules after seekTo into a region with unplayed notes", () => {
    const sched = createLookaheadScheduler();
    const note = { pitch: 60, velocity: 100, start: 4, duration: 1 };
    sched.start([note], 120, 0);
    vi.advanceTimersByTime(500);
    const afterFirst = fakeCtx.getStartCount();
    sched.seekTo(2);
    vi.advanceTimersByTime(2000);
    expect(fakeCtx.getStartCount()).toBeGreaterThan(afterFirst);
    sched.stop();
    vi.useRealTimers();
  });
});
