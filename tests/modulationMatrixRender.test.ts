import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { applyPluginChain } from "../src/lib/pluginChain";
import type { Plugin } from "../src/lib/types";
import { PLUGIN_SPECS } from "../src/lib/types";
import {
  setModulationState,
  addModRoute,
} from "../src/lib/modulationMatrix";
import { installMockAudioContext, MockOfflineAudioContext } from "./audioMock";

beforeAll(() => {
  installMockAudioContext();
});

afterEach(() => {
  setModulationState({ routes: [] });
});

function makeBuffer(ch: number, len: number, sr: number, fill: (c: number, i: number) => number) {
  const ctx = new MockOfflineAudioContext(ch, len, sr);
  const buf = ctx.createBuffer(ch, len, sr);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = fill(c, i);
  }
  return buf;
}

function rms(buf: AudioBuffer, c = 0): number {
  const d = buf.getChannelData(c);
  let s = 0;
  for (let i = 0; i < d.length; i++) s += d[i] * d[i];
  return Math.sqrt(s / d.length);
}

function makePlugin(type: Plugin["type"], params: Record<string, any> = {}): Plugin {
  const spec = PLUGIN_SPECS[type];
  const full = { ...spec.params.reduce((a, p) => ((a[p.id] = p.default), a), {} as Record<string, number>), ...params };
  return { id: `t-${type}`, name: type, type, enabled: true, params: full, color: "#fff" };
}

describe("applyPluginChain applies modulation matrix at playback time", () => {
  const sr = 44100;
  const buf = makeBuffer(2, 4096, sr, (c, i) =>
    0.5 * Math.sin((2 * Math.PI * 440 * i) / sr) * (c === 0 ? 1 : 0.8),
  );

  it("modulates a mapped utility volume param (routed != unrouted)", async () => {
    addModRoute("lfo1", "amp.gain", 1, false);
    const routed = await applyPluginChain(buf, [makePlugin("utility", { volume: 0 })], sr, { modTime: 0.13 });
    setModulationState({ routes: [] });
    const base = await applyPluginChain(buf, [makePlugin("utility", { volume: 0 })], sr, { modTime: 0.13 });
    expect(rms(routed, 0)).not.toBeCloseTo(rms(base, 0), 2);
  });

  it("leaves output unchanged when no mod route is active", async () => {
    setModulationState({ routes: [] });
    const a = await applyPluginChain(buf, [makePlugin("utility", { volume: 50 })], sr, { modTime: 0.3 });
    const b = await applyPluginChain(buf, [makePlugin("utility", { volume: 50 })], sr);
    expect(rms(a, 0)).toBeCloseTo(rms(b, 0), 6);
  });

  it("uses the live transport clock (different modTime -> different level)", async () => {
    addModRoute("lfo1", "amp.gain", 1, true);
    const t0 = await applyPluginChain(buf, [makePlugin("utility", { volume: 50 })], sr, { modTime: 0 });
    const t1 = await applyPluginChain(buf, [makePlugin("utility", { volume: 50 })], sr, { modTime: 0.25 });
    expect(rms(t0, 0)).not.toBeCloseTo(rms(t1, 0), 2);
  });
});
