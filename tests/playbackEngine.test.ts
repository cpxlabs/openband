import { describe, it, expect, beforeAll, vi } from "vitest";
import { installMockAudioContext } from "./audioMock";
import { renderTrackStem, getProjectDurationSeconds } from "../src/lib/midiSynth";
import { PlaybackEngine } from "../src/lib/playbackEngine";
import type { TrackDef } from "../src/lib/types";

vi.mock("../src/lib/universalAudio", () => ({
  audioSystem: {
    ensureContext: () => {
      const node = () => ({
        gain: { value: 1, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} },
        pan: { value: 0, setTargetAtTime() {} },
        connect() { return this; },
        disconnect() {},
        start() {},
        stop() {},
        buffer: null,
        onended: null,
      });
      return Promise.resolve({
        currentTime: 0,
        destination: node(),
        createGain: node,
        createStereoPanner: node,
        createBufferSource: () => {
          const n = node();
          n.onended = null;
          return n;
        },
        sampleRate: 44100,
      } as unknown as AudioContext);
    },
  },
}));

beforeAll(() => {
  installMockAudioContext();
});

function makeTrack(automation?: Record<string, { time: number; value: number; curve: "linear" | "exponential" }[]>): TrackDef {
  return {
    id: "t1",
    name: "Lead",
    color: "bg-blue-500",
    muted: false,
    solo: false,
    volume: 60,
    pan: 0,
    sends: {},
    sidechainSource: null,
    regions: [],
    midiNotes: [{ pitch: 69, start: 0, duration: 20, velocity: 110 }],
    plugins: [],
    automation: automation ?? {},
  } as unknown as TrackDef;
}

function rms(buffer: AudioBuffer, startSec: number, endSec: number): number {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const s = Math.floor(startSec * sr);
  const e = Math.min(data.length, Math.floor(endSec * sr));
  let sum = 0;
  let n = 0;
  for (let i = s; i < e; i++) {
    sum += data[i] * data[i];
    n++;
  }
  return n === 0 ? 0 : Math.sqrt(sum / n);
}

describe("renderTrackStem automation", () => {
  it("returns a non-null buffer for a MIDI track", async () => {
    const track = makeTrack();
    const buf = await renderTrackStem(track, 120, 10);
    expect(buf).not.toBeNull();
    expect(buf!.duration).toBeGreaterThan(0);
  });

  it("bakes a volume automation lane so RMS rises over time", async () => {
    const track = makeTrack({
      volume: [
        { time: 0, value: 5, curve: "linear" },
        { time: 16, value: 100, curve: "linear" },
      ],
    });
    const buf = await renderTrackStem(track, 120, 10);
    expect(buf).not.toBeNull();
    const early = rms(buf!, 0.5, 2);
    const late = rms(buf!, 8.5, 9.5);
    expect(late).toBeGreaterThan(early);
  });

  it("does not throw when called twice with identical content", async () => {
    const track = makeTrack();
    const a = await renderTrackStem(track, 120, 10);
    const b = await renderTrackStem(track, 120, 10);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });
});

describe("getProjectDurationSeconds", () => {
  it("returns 0 for an empty project", () => {
    expect(getProjectDurationSeconds([], 120)).toBe(0);
  });
  it("accounts for MIDI note ends", () => {
    const track = makeTrack();
    const d = getProjectDurationSeconds([track], 120);
    expect(d).toBeGreaterThan(0);
  });
});

describe("PlaybackEngine hashTrack", () => {
  it("changes when volume changes and is stable otherwise", () => {
    const engine = new PlaybackEngine();
    const base = makeTrack();
    const h1 = engine.hashTrack(base, 120);
    const louder = { ...base, volume: 90 };
    const h2 = engine.hashTrack(louder, 120);
    expect(h1).not.toEqual(h2);
    const same = { ...base };
    expect(engine.hashTrack(same, 120)).toEqual(h1);
  });

  it("changes when automation changes", () => {
    const engine = new PlaybackEngine();
    const base = makeTrack();
    const h1 = engine.hashTrack(base, 120);
    const withAuto = makeTrack({ volume: [{ time: 0, value: 50, curve: "linear" }] });
    expect(engine.hashTrack(withAuto, 120)).not.toEqual(h1);
  });
});

describe("PlaybackEngine LRU cache", () => {
  it("caps the stem cache at 32 (LRU eviction)", async () => {
    const engine = new PlaybackEngine();
    const tracks: TrackDef[] = [];
    for (let i = 0; i < 40; i++) {
      tracks.push({
        id: `t-${i}`,
        name: `Track ${i}`,
        color: "bg-blue-500",
        muted: false,
        solo: false,
        volume: 70,
        pan: 0,
        sends: {},
        sidechainSource: null,
        regions: [],
        midiNotes: [{ pitch: 60 + (i % 12), start: 0, duration: 0.1, velocity: 100 }],
        plugins: [],
        automation: {},
      } as unknown as TrackDef);
    }
    await engine.prepare(tracks, 120, 0.1, 4);
    expect(engine.stemCount).toBeLessThanOrEqual(32);
    engine.dispose();
  });
});
