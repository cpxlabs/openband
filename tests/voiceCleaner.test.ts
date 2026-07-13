import { describe, it, expect, beforeAll } from "vitest";
import { applyPluginChain } from "../src/lib/pluginChain";
import { PLUGIN_SPECS, type Plugin, type PluginType } from "../src/lib/types";
import { installMockAudioContext } from "./audioMock";

beforeAll(() => {
  installMockAudioContext();
});

function mockAudioBuffer(
  channels: number,
  length: number,
  sampleRate: number,
): AudioBuffer {
  const ctx: any = new (globalThis.OfflineAudioContext as any)(
    channels,
    length,
    sampleRate,
  );
  const buf = ctx.createBuffer(channels, length, sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.sin((i / length) * Math.PI * 4) * 0.5;
    }
  }
  return buf;
}

function makePlugin(
  type: PluginType,
  enabled = true,
  extraParams: Record<string, number> = {},
): Plugin {
  return {
    id: `test-${type}`,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    type,
    enabled,
    params: extraParams,
    color: "#fff",
  };
}

describe("voiceCleaner", () => {
  it("PLUGIN_SPECS.voiceCleaner exists with the 4 canonical params", () => {
    expect(PLUGIN_SPECS.voiceCleaner).toBeDefined();
    const ids = PLUGIN_SPECS.voiceCleaner.params.map((p) => p.id);
    expect(ids).toHaveLength(4);
    expect(ids).toEqual(
      expect.arrayContaining(["threshold", "highpass", "reduction", "mix"]),
    );
  });

  it("applyPluginChain with voiceCleaner returns a buffer of the same length and channels without throwing", async () => {
    const buf = mockAudioBuffer(2, 2048, 44100);
    const plugin = makePlugin("voiceCleaner", true, {
      threshold: -40,
      highpass: 80,
      reduction: 40,
      mix: 100,
    });
    const result = await applyPluginChain(buf, [plugin], 44100);
    expect(result.length).toBe(buf.length);
    expect(result.numberOfChannels).toBe(buf.numberOfChannels);
  });

  it("voiceCleaner with dry/wet mix still produces a valid buffer", async () => {
    const buf = mockAudioBuffer(2, 1024, 48000);
    const plugin = makePlugin("voiceCleaner", true, {
      threshold: -30,
      highpass: 120,
      reduction: 80,
      mix: 50,
    });
    const result = await applyPluginChain(buf, [plugin], 48000);
    expect(result.length).toBe(buf.length);
    expect(result.numberOfChannels).toBe(buf.numberOfChannels);
  });
});
