import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { AudioResourceGuard, type PreviewVoice, type AudioContextLike, type PreviewVoiceFactory } from "../src/lib/audioResourceGuard";

interface FakeVoice extends PreviewVoice {
  _play: number;
  _stop: number;
  _dispose: number;
}

function makeVoice(): FakeVoice {
  return {
    _play: 0,
    _stop: 0,
    _dispose: 0,
    play() {
      this._play++;
    },
    stop() {
      this._stop++;
    },
    dispose() {
      this._dispose++;
    },
  };
}

function makeCtx(): AudioContextLike & { volume: number; _calls: number[] } {
  const ctx: any = {
    id: "shared",
    volume: 1,
    setVolume(v: number) {
      this.volume = v;
      ctx._calls.push(v);
    },
    _calls: [] as number[],
  };
  return ctx;
}

function makeFactory(behaviors: Record<number, "throw"> = {}) {
  const all: FakeVoice[] = [];
  const factory: PreviewVoiceFactory & { _all: FakeVoice[] } = {
    _all: all,
    create() {
      const v = makeVoice();
      all.push(v);
      const idx = all.length;
      if (behaviors[idx] === "throw") {
        v.play = () => {
          throw new Error("boom");
        };
      }
      return v;
    },
  };
  return factory;
}

describe("AudioResourceGuard", () => {
  it("G53 single context reused", () => {
    const ctx = makeCtx();
    const ctxSeen: AudioContextLike[] = [];
    const factory: PreviewVoiceFactory = {
      create(c) {
        ctxSeen.push(c);
        return makeVoice();
      },
    };
    const g = new AudioResourceGuard({ context: ctx, factory });
    for (let i = 0; i < 6; i++) g.preview({});
    assert.equal(ctxSeen.length, 6);
    assert.ok(ctxSeen.every((c) => c === ctx));
  });

  it("G54 invalidate on key/BPM change", () => {
    const ctx = makeCtx();
    const f = makeFactory();
    const g = new AudioResourceGuard({ context: ctx, factory: f });
    const t = g.preview({ key: "C", bpm: 90 });
    const v = f._all[t - 1];
    g.invalidate({ key: "D" });
    assert.equal(v._dispose, 1);
    assert.equal(g.activeCount, 0);

    const t2 = g.preview({ key: "C", bpm: 90 });
    const v2 = f._all[t2 - 1];
    g.invalidate({ bpm: 120 });
    assert.equal(v2._dispose, 1);
    assert.equal(g.activeCount, 0);
  });

  it("G55 releases nodes after stop", () => {
    const ctx = makeCtx();
    const f = makeFactory();
    const g = new AudioResourceGuard({ context: ctx, factory: f });
    const t = g.preview({});
    const v = f._all[t - 1];
    g.stop(t);
    assert.equal(v._dispose, 1);
    assert.equal(g.activeCount, 0);
  });

  it("G56 bounded simultaneous voices", () => {
    const ctx = makeCtx();
    const f = makeFactory();
    const g = new AudioResourceGuard({ context: ctx, factory: f, maxVoices: 4 });
    const order: number[] = [];
    const wrapped: PreviewVoiceFactory = {
      create(c, p) {
        const v = f.create(c, p) as FakeVoice;
        const origDispose = v.dispose;
        v.dispose = () => {
          order.push(f._all.indexOf(v) + 1);
          origDispose.call(v);
        };
        return v;
      },
    };
    const g2 = new AudioResourceGuard({ context: ctx, factory: wrapped, maxVoices: 4 });
    for (let i = 0; i < 6; i++) g2.preview({});
    assert.ok(g2.activeCount <= 4);
    assert.deepEqual(order, [1, 2]);
    void g;
  });

  it("G57 restore default volume", () => {
    const ctx = makeCtx();
    const f = makeFactory();
    const g = new AudioResourceGuard({ context: ctx, factory: f, defaultVolume: 0.5 });
    g.preview({ volume: 1 });
    g.stopAll();
    assert.equal(ctx.volume, 0.5);
    ctx.volume = 0.2;
    g.restoreVolume();
    assert.equal(ctx.volume, 0.5);
  });

  it("G58 no orphans after dispose", () => {
    const ctx = makeCtx();
    const f = makeFactory();
    const g = new AudioResourceGuard({ context: ctx, factory: f });
    const tokens = [g.preview({}), g.preview({}), g.preview({})];
    g.dispose();
    assert.equal(g.activeCount, 0);
    for (const t of tokens) assert.equal(f._all[t - 1]._dispose, 1);
  });

  it("G59 play/stop idempotent", () => {
    const ctx = makeCtx();
    const f = makeFactory();
    const g = new AudioResourceGuard({ context: ctx, factory: f });
    const t = g.preview({});
    const v = f._all[t - 1];
    g.stop(t);
    g.stop(t);
    assert.equal(v._stop, 1);
    g.play(t);
    assert.equal(v._play, 1);
    assert.doesNotThrow(() => g.stop(999));
    assert.doesNotThrow(() => g.play(999));
  });

  it("G60 preview failure does not break subsequent playback", () => {
    const ctx = makeCtx();
    const f = makeFactory({ 1: "throw" });
    const g = new AudioResourceGuard({ context: ctx, factory: f });
    assert.doesNotThrow(() => g.preview({}));
    assert.equal(f._all[0]._dispose, 1);
    const t = g.preview({});
    assert.ok(g.activeCount >= 1);
    assert.equal(f._all[t - 1]._dispose, 0);
  });
});
