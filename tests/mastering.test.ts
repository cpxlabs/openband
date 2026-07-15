import { describe, it, expect } from "vitest";
import {
  MASTERING_CHAIN_PRESETS,
  buildMasteringChain,
  validateMasteringChain,
  applyMasteringChain,
} from "../src/lib/mastering";
import type { Plugin } from "../src/lib/types";

class MockAudioParam {
  value: number;
  constructor(v = 0) {
    this.value = v;
  }
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private channels: Float32Array[];
  constructor(a: any, b?: number, c?: number) {
    if (typeof a === "object" && a !== null) {
      this.numberOfChannels = a.numberOfChannels;
      this.length = a.length;
      this.sampleRate = a.sampleRate;
    } else {
      this.numberOfChannels = a;
      this.length = b!;
      this.sampleRate = c!;
    }
    this.channels = [];
    for (let i = 0; i < this.numberOfChannels; i++) {
      this.channels.push(new Float32Array(this.length));
    }
  }
  getChannelData(c: number): Float32Array {
    return this.channels[c];
  }
}

function applyCurve(curve: Float32Array | null, x: number): number {
  if (!curve) return x;
  const n = curve.length;
  const xi = ((Math.max(-1, Math.min(1, x)) + 1) / 2) * (n - 1);
  const i0 = Math.floor(xi);
  const i1 = Math.min(n - 1, i0 + 1);
  const frac = xi - i0;
  return curve[i0] * (1 - frac) + curve[i1] * frac;
}

class MockNode {
  _inputs: any[] = [];
  connect(dest: any): any {
    dest._inputs.push(this);
    return dest;
  }
  _process(): Float32Array[] {
    return this._inputs.flatMap((i: any) => i._process());
  }
}

class MockSource extends MockNode {
  buffer: any = null;
  start() {}
  _process(): Float32Array[] {
    if (!this.buffer) return [];
    const out: Float32Array[] = [];
    for (let c = 0; c < this.buffer.numberOfChannels; c++) {
      out.push(this.buffer.getChannelData(c));
    }
    return out;
  }
}

class MockWaveShaper extends MockNode {
  curve: Float32Array | null = null;
  _process(): Float32Array[] {
    const upstream = this._inputs.flatMap((i: any) => i._process());
    return upstream.map((ch: Float32Array) => {
      const out = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i++) out[i] = applyCurve(this.curve, ch[i]);
      return out;
    });
  }
}

class MockGain extends MockNode {
  gain = new MockAudioParam(1);
  _process(): Float32Array[] {
    const upstream = this._inputs.flatMap((i: any) => i._process());
    return upstream.map((ch: Float32Array) => {
      const out = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i++) out[i] = ch[i] * this.gain.value;
      return out;
    });
  }
}

class MockComp extends MockNode {
  threshold = new MockAudioParam(0);
  knee = new MockAudioParam(0);
  ratio = new MockAudioParam(1);
  attack = new MockAudioParam(0);
  release = new MockAudioParam(0);
}

class MockBiquad extends MockNode {
  type = "peaking";
  frequency = new MockAudioParam(0);
  gain = new MockAudioParam(0);
  Q = new MockAudioParam(1);
}

class MockDestination extends MockNode {
  _render(): MockAudioBuffer {
    const buffers = this._inputs.flatMap((i: any) => i._process());
    const numCh = buffers.length || 1;
    const len = buffers[0]?.length || 0;
    const out = new MockAudioBuffer(numCh, len, 48000);
    buffers.forEach((ch: Float32Array, c: number) =>
      out.getChannelData(c).set(ch),
    );
    return out;
  }
}

class MockOfflineAudioContext {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  destination: MockDestination;
  constructor(numCh: number, len: number, sampleRate: number) {
    this.numberOfChannels = numCh;
    this.length = len;
    this.sampleRate = sampleRate;
    this.destination = new MockDestination();
  }
  createBufferSource() {
    return new MockSource();
  }
  createGain() {
    return new MockGain();
  }
  createBiquadFilter() {
    return new MockBiquad();
  }
  createDynamicsCompressor() {
    return new MockComp();
  }
  createWaveShaper() {
    return new MockWaveShaper();
  }
  createDelay() {
    return new MockGain();
  }
  createStereoPanner() {
    return new MockGain();
  }
  createChannelSplitter() {
    return new MockNode();
  }
  createBuffer(numCh: number, len: number, sr: number) {
    return new MockAudioBuffer(numCh, len, sr);
  }
  startRendering() {
    return Promise.resolve(this.destination._render());
  }
}

const g = globalThis as any;
if (!g.OfflineAudioContext) g.OfflineAudioContext = MockOfflineAudioContext;
if (!g.AudioBuffer) g.AudioBuffer = MockAudioBuffer;

function plugin(type: string): Plugin {
  return { id: type, name: type, type: type as any, enabled: true, params: {} };
}

describe("validateMasteringChain", () => {
  it("accepts a normal chain", () => {
    const chain = [plugin("eq"), plugin("compressor"), plugin("truePeakLimiter")];
    expect(validateMasteringChain(chain).valid).toBe(true);
  });

  it("rejects duplicate terminal limiter", () => {
    const chain = [plugin("eq"), plugin("limiter"), plugin("truePeakLimiter")];
    const res = validateMasteringChain(chain);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("limiter");
  });

  it("accepts a preset (MasteringChainPreset)", () => {
    const preset = MASTERING_CHAIN_PRESETS.find((p) => p.name === "Master Rápido")!;
    expect(validateMasteringChain(preset).valid).toBe(true);
  });
});

describe("mastering preset fixes", () => {
  for (const name of ["Loudness Maximizer", "EDM Club", "Lo-Fi Vibe"]) {
    it(`"${name}" ends with single truePeakLimiter`, () => {
      const preset = MASTERING_CHAIN_PRESETS.find((p) => p.name === name)!;
      const last = preset.plugins[preset.plugins.length - 1];
      const secondLast = preset.plugins[preset.plugins.length - 2];
      expect(last.type).toBe("truePeakLimiter");
      expect(secondLast.type).not.toBe("limiter");
    });
  }

  it("all presets build valid Plugin[] of matching length", () => {
    for (const preset of MASTERING_CHAIN_PRESETS) {
      const chain = buildMasteringChain(preset);
      expect(chain.length).toBe(preset.plugins.length);
      expect(chain.every((p) => p.enabled === true)).toBe(true);
    }
  });
});

describe("validateMasteringChain terminal limiter", () => {
  it("rejects two consecutive truePeakLimiter terminal nodes", () => {
    const chain = [
      plugin("eq"),
      plugin("truePeakLimiter"),
      plugin("truePeakLimiter"),
    ];
    const res = validateMasteringChain(chain);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("limiter");
  });

  it("accepts a chain with fewer than two nodes", () => {
    expect(validateMasteringChain([plugin("eq")]).valid).toBe(true);
    expect(validateMasteringChain([] as Plugin[]).valid).toBe(true);
  });
});

describe("applyMasteringChain bounce ceiling", () => {
  it("never exceeds the true-peak ceiling on a full-scale buffer", async () => {
    const preset = MASTERING_CHAIN_PRESETS.find(
      (p) => p.name === "Master Rápido",
    )!;
    const buffer = new AudioBuffer({
      numberOfChannels: 2,
      length: 24000,
      sampleRate: 48000,
    });
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] = 1.0;
    }
    const rendered = await applyMasteringChain(
      buffer,
      buildMasteringChain(preset),
      48000,
    );
    let maxAbs = 0;
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      const data = rendered.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        maxAbs = Math.max(maxAbs, Math.abs(data[i]));
      }
    }
    expect(maxAbs).toBeLessThanOrEqual(1.0001);
  });
});
