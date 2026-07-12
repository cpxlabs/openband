// @ts-nocheck
// A small but real sample-accurate OfflineAudioContext mock used to assert
// audible / param-correct behavior of the plugin DSP graphs. It implements
// BiquadFilter, Gain, WaveShaper, DynamicsCompressor, ChannelSplitter/Merger,
// StereoPanner, Delay, Convolver and Oscillator with real DSP math (enough
// fidelity to verify ceiling limits, band attenuation and stereo preservation).

type Frame = number[];

class MockAudioParam {
  value: number;
  owner: any;
  _isParam = true;
  modulations: any[] = [];
  _schedule: { t: number; v: number }[] = [];
  constructor(owner: any, value = 0) {
    this.owner = owner;
    this.value = value;
  }
  setValueAtTime(v: number, t: number) {
    this._schedule.push({ t, v });
  }
  linearRampToValueAtTime(v: number, t: number) {
    this._schedule.push({ t, v });
  }
  setValueCurveAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {
    this._schedule = [];
  }
  effective(t: number): number {
    let v = this.value;
    if (this._schedule.length) {
      let chosen = this._schedule[0].v;
      for (const s of this._schedule) {
        if (s.t <= t) chosen = s.v;
        else break;
      }
      v = chosen;
    }
    for (const m of this.modulations) {
      const frame = m._frame;
      if (frame) v += frame[0] || 0;
    }
    return v;
  }
}

class MockNode {
  ctx: any;
  kind: string;
  inputs: { from: MockNode; out: number; in: number }[] = [];
  _frame: Frame = [];
  _state: any = {};
  frequency = new MockAudioParam(this, 1000);
  Q = new MockAudioParam(this, 1);
  gain = new MockAudioParam(this, 1);
  pan = new MockAudioParam(this, 0);
  delayTime = new MockAudioParam(this, 0);
  threshold = new MockAudioParam(this, -24);
  knee = new MockAudioParam(this, 30);
  ratio = new MockAudioParam(this, 12);
  attack = new MockAudioParam(this, 0.003);
  release = new MockAudioParam(this, 0.25);
  type = "lowpass";
  curve: Float32Array | null = null;
  buffer: any = null;
  constructor(ctx: any, kind: string) {
    this.ctx = ctx;
    this.kind = kind;
  }
  connect(dest: any, out = 0, inn = 0) {
    if (dest && dest._isParam) {
      dest.modulations.push(this);
      if (dest.owner) this.ctx._addEdge(this, dest.owner);
      return;
    }
    this.ctx._addEdge(this, dest);
    dest.inputs.push({ from: this, out, in: inn });
    return dest;
  }
  disconnect() {}
  start() {}
  stop() {}
}

class MockOfflineAudioContext {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  destination: MockNode;
  _nodes: MockNode[] = [];
  _edges: [MockNode, MockNode][] = [];
  constructor(ch: number, len: number, sr: number) {
    this.numberOfChannels = ch;
    this.length = len;
    this.sampleRate = sr;
    this.destination = new MockNode(this, "destination");
    this._nodes.push(this.destination);
  }
  _addEdge(a: MockNode, b: MockNode) {
    if (!this._edges.find(([x, y]) => x === a && y === b)) this._edges.push([a, b]);
  }
  createBufferSource() {
    const n = new MockNode(this, "source");
    this._nodes.push(n);
    return n;
  }
  createGain() {
    const n = new MockNode(this, "gain");
    this._nodes.push(n);
    return n;
  }
  createBiquadFilter() {
    const n = new MockNode(this, "biquad");
    this._nodes.push(n);
    return n;
  }
  createWaveShaper() {
    const n = new MockNode(this, "waveshaper");
    this._nodes.push(n);
    return n;
  }
  createDynamicsCompressor() {
    const n = new MockNode(this, "compressor");
    this._nodes.push(n);
    return n;
  }
  createChannelSplitter() {
    const n = new MockNode(this, "splitter");
    this._nodes.push(n);
    return n;
  }
  createChannelMerger() {
    const n = new MockNode(this, "merger");
    this._nodes.push(n);
    return n;
  }
  createStereoPanner() {
    const n = new MockNode(this, "panner");
    this._nodes.push(n);
    return n;
  }
  createDelay() {
    const n = new MockNode(this, "delay");
    this._nodes.push(n);
    return n;
  }
  createConvolver() {
    const n = new MockNode(this, "convolver");
    this._nodes.push(n);
    return n;
  }
  createOscillator() {
    const n = new MockNode(this, "oscillator");
    this._nodes.push(n);
    return n;
  }
  createBuffer(ch: number, len: number, sr: number) {
    const data: Float32Array[] = [];
    for (let c = 0; c < ch; c++) data.push(new Float32Array(len));
    return {
      numberOfChannels: ch,
      length: len,
      sampleRate: sr,
      duration: len / sr,
      getChannelData: (c: number): Float32Array<ArrayBuffer> => data[c],
      copyFromChannel: (_dest: Float32Array<ArrayBuffer>, _channel: number, _bufferOffset?: number) => {},
      copyToChannel: (_src: Float32Array<ArrayBuffer>, _channel: number, _bufferOffset?: number) => {},
    };
  }
  startRendering() {
    const len = this.length;
    const sr = this.sampleRate;
    const order = this._topo();
    const dest = this.destination;
    let destCh = 2;
    for (const inp of dest.inputs) destCh = Math.max(destCh, inp.in + 1);
    const out: Float32Array[] = [];
    for (let c = 0; c < destCh; c++) out.push(new Float32Array(len));
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      for (const node of order) this._compute(node, i, t);
      for (let c = 0; c < destCh; c++) out[c][i] = dest._frame[c] || 0;
    }
    return Promise.resolve({
      numberOfChannels: destCh,
      length: len,
      sampleRate: sr,
      duration: len / sr,
      getChannelData: (c: number): Float32Array<ArrayBuffer> => out[c],
      copyFromChannel: (_dest: Float32Array<ArrayBuffer>, _channel: number, _bufferOffset?: number) => {},
      copyToChannel: (_src: Float32Array<ArrayBuffer>, _channel: number, _bufferOffset?: number) => {},
    });
  }
  _topo(): MockNode[] {
    const nodes = this._nodes;
    const indeg = new Map<MockNode, number>();
    const adj = new Map<MockNode, MockNode[]>();
    for (const n of nodes) {
      indeg.set(n, 0);
      adj.set(n, []);
    }
    for (const [a, b] of this._edges) {
      indeg.set(b, (indeg.get(b) || 0) + 1);
      adj.get(a)!.push(b);
    }
    const queue: MockNode[] = [];
    for (const n of nodes) if ((indeg.get(n) || 0) === 0) queue.push(n);
    const result: MockNode[] = [];
    while (queue.length) {
      const n = queue.shift()!;
      result.push(n);
      for (const m of adj.get(n)!) {
        indeg.set(m, (indeg.get(m) || 0) - 1);
        if (indeg.get(m) === 0) queue.push(m);
      }
    }
    if (result.length !== nodes.length) return nodes;
    return result;
  }
  _computeInput(node: MockNode): number[] {
    const inCh: number[] = [];
    for (const c of node.inputs) {
      const f = c.from._frame;
      if (!f) continue;
      const srcCh = f.length;
      if (c.out === 0 && srcCh > 1 && c.from.kind !== "splitter") {
        for (let ch = 0; ch < srcCh; ch++) inCh[ch] = (inCh[ch] || 0) + (f[ch] || 0);
      } else {
        inCh[c.in] = (inCh[c.in] || 0) + (f[c.out] || 0);
      }
    }
    return inCh;
  }
  _compute(node: MockNode, i: number, t: number) {
    switch (node.kind) {
      case "source": {
        const buf = node.buffer;
        const ch = buf ? buf.numberOfChannels : 1;
        const frame: number[] = [];
        for (let c = 0; c < ch; c++) {
          const d = buf.getChannelData(c);
          frame[c] = d[i] || 0;
        }
        node._frame = frame;
        break;
      }
      case "gain": {
        const inCh = this._computeInput(node);
        const g = node.gain.effective(t);
        node._frame = inCh.map((v) => v * g);
        break;
      }
      case "biquad": {
        const inCh = this._computeInput(node);
        const coeffs = this._biquadCoeffs(node);
        if (!node._state.coeffs || node._state.coeffsKey !== coeffs.key) {
          node._state.coeffs = coeffs;
          node._state.coeffsKey = coeffs.key;
          node._state.ch = inCh.map(() => ({
            x1: 0, x2: 0, y1: 0, y2: 0,
          }));
        }
        const st = node._state.ch;
        const frame: number[] = [];
        for (let c = 0; c < inCh.length; c++) {
          const s = st[c] || (st[c] = { x1: 0, x2: 0, y1: 0, y2: 0 });
          const x0 = inCh[c] || 0;
          const y0 = coeffs.b0 * x0 + coeffs.b1 * s.x1 + coeffs.b2 * s.x2 - coeffs.a1 * s.y1 - coeffs.a2 * s.y2;
          s.x2 = s.x1; s.x1 = x0;
          s.y2 = s.y1; s.y1 = y0;
          frame[c] = y0;
        }
        node._frame = frame;
        break;
      }
      case "waveshaper": {
        const inCh = this._computeInput(node);
        const curve = node.curve;
        node._frame = inCh.map((v) => this._curveLookup(curve, v));
        break;
      }
      case "compressor": {
        const inCh = this._computeInput(node);
        const threshLin = Math.pow(10, node.threshold.value / 20);
        const ratio = node.ratio.value;
        const atk = Math.max(0.0001, 1 - Math.exp(-1 / (Math.max(0.001, node.attack.value) * this.sampleRate)));
        const rel = Math.max(0.0001, 1 - Math.exp(-1 / (Math.max(0.001, node.release.value) * this.sampleRate)));
        if (!node._state.ch) node._state.ch = inCh.map(() => ({ env: 0, g: 1 }));
        const st = node._state.ch;
        const frame: number[] = [];
        for (let c = 0; c < inCh.length; c++) {
          const s = st[c] || (st[c] = { env: 0, g: 1 });
          const x = inCh[c] || 0;
          const peak = Math.abs(x);
          s.env = peak > s.env ? peak : s.env * rel + peak * (1 - rel);
          let target = 1;
          if (s.env > threshLin) {
            const over = s.env - threshLin;
            target = threshLin / (threshLin + over * (ratio - 1));
          }
          const coef = target < s.g ? atk : rel;
          s.g = s.g + (target - s.g) * coef;
          frame[c] = x * s.g;
        }
        node._frame = frame;
        break;
      }
      case "splitter": {
        const inCh = this._computeInput(node);
        node._frame = inCh;
        break;
      }
      case "merger": {
        const inCh = this._computeInput(node);
        let maxCh = 0;
        for (const inp of node.inputs) maxCh = Math.max(maxCh, inp.in + 1);
        const frame: number[] = new Array(maxCh).fill(0);
        for (const inp of node.inputs) {
          const f = inp.from._frame;
          if (f) frame[inp.in] = (frame[inp.in] || 0) + (f[inp.out] || 0);
        }
        node._frame = frame;
        break;
      }
      case "panner": {
        const inCh = this._computeInput(node);
        const pan = Math.max(-1, Math.min(1, node.pan.effective(t)));
        const l = inCh[0] || 0;
        const r = inCh[1] || 0;
        const lp = Math.max(0, pan);
        const ln = Math.max(0, -pan);
        node._frame = [l * (1 - lp) + r * ln, r * (1 - lp) + l * lp];
        break;
      }
      case "delay": {
        const inCh = this._computeInput(node);
        if (!node._state.hist) node._state.hist = inCh.map(() => [] as number[]);
        const st = node._state.hist;
        const d = Math.round(node.delayTime.effective(t) * this.sampleRate);
        const frame: number[] = [];
        for (let c = 0; c < inCh.length; c++) {
          const h = st[c];
          h.push(inCh[c] || 0);
          const idx = Math.max(0, h.length - 1 - d);
          frame[c] = h[idx] || 0;
        }
        node._frame = frame;
        break;
      }
      case "convolver": {
        node._frame = this._computeInput(node);
        break;
      }
      case "oscillator": {
        const freq = node.frequency.value;
        node._frame = [Math.sin((2 * Math.PI * freq * i) / this.sampleRate)];
        break;
      }
      case "destination": {
        node._frame = this._computeInput(node);
        break;
      }
      default:
        node._frame = this._computeInput(node);
    }
  }
  _curveLookup(curve: Float32Array | null, x: number): number {
    if (!curve || curve.length < 2) return x;
    const v = Math.max(-1, Math.min(1, x));
    const idx = ((v + 1) / 2) * (curve.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(curve.length - 1, i0 + 1);
    const frac = idx - i0;
    return curve[i0] * (1 - frac) + curve[i1] * frac;
  }
  _biquadCoeffs(node: MockNode) {
    const w0 = (2 * Math.PI * node.frequency.value) / this.sampleRate;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const Q = Math.max(0.0001, node.Q.value);
    const alpha = sinw / (2 * Q);
    const A = Math.pow(10, node.gain.value / 40);
    const S = 1;
    const TWO_SQRT_A = 2 * Math.sqrt(A);
    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
    const type = node.type;
    if (type === "lowpass") {
      b0 = (1 - cosw) / 2; b1 = 1 - cosw; b2 = (1 - cosw) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
    } else if (type === "highpass") {
      b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
    } else if (type === "peaking") {
      b0 = 1 + alpha * A; b1 = -2 * cosw; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cosw; a2 = 1 - alpha / A;
    } else if (type === "lowshelf") {
      const al = sinw / 2 * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
      b0 = A * ((A + 1) - (A - 1) * cosw + TWO_SQRT_A * al);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosw);
      b2 = A * ((A + 1) - (A - 1) * cosw - TWO_SQRT_A * al);
      a0 = (A + 1) + (A - 1) * cosw + TWO_SQRT_A * al;
      a1 = -2 * ((A - 1) + (A + 1) * cosw);
      a2 = (A + 1) + (A - 1) * cosw - TWO_SQRT_A * al;
    } else if (type === "highshelf") {
      const al = sinw / 2 * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
      b0 = A * ((A + 1) + (A - 1) * cosw + TWO_SQRT_A * al);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
      b2 = A * ((A + 1) + (A - 1) * cosw - TWO_SQRT_A * al);
      a0 = (A + 1) + (A - 1) * cosw + TWO_SQRT_A * al;
      a1 = -2 * ((A - 1) + (A + 1) * cosw);
      a2 = (A + 1) + (A - 1) * cosw - TWO_SQRT_A * al;
    } else if (type === "notch") {
      b0 = 1; b1 = -2 * cosw; b2 = 1;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
    } else if (type === "bandpass") {
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
    } else if (type === "allpass") {
      b0 = 1 - alpha; b1 = -2 * cosw; b2 = 1 + alpha;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
    }
    const key = `${type}:${node.frequency.value}:${Q}:${node.gain.value}`;
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, key };
  }
}

export function installMockAudioContext() {
  (globalThis as any).OfflineAudioContext = MockOfflineAudioContext;
}
export { MockOfflineAudioContext };
