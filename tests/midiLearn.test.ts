import { describe, it, expect, vi, beforeEach } from "vitest";

function makeInput(id: string, name: string) {
  return { id, name, onmidimessage: null as null | ((e: { data: number[] }) => void) };
}

function makeAccess(inputs: ReturnType<typeof makeInput>[]) {
  const map = new Map<string, ReturnType<typeof makeInput>>();
  inputs.forEach((i) => map.set(i.id, i));
  return {
    inputs: map,
    outputs: new Map(),
    onstatechange: null as null | ((e: { target: unknown }) => void),
  };
}

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

describe("midiLearn", () => {
  let input: ReturnType<typeof makeInput>;

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    input = makeInput("in1", "Test Device");
    const access = makeAccess([input]);
    (navigator as any).requestMIDIAccess = vi.fn().mockResolvedValue(access);
    (globalThis as any).__input = input;
  });

  it("learnCC captures the first CC from a fake onmidimessage dispatch", async () => {
    const { learnCC } = await import("../src/lib/midiLearn");
    const captured = new Promise<[number, number]>((resolve) => {
      const stop = learnCC((cc, channel) => {
        resolve([cc, channel]);
        stop();
      });
    });
    await tick();
    input.onmidimessage?.({ data: [0xb0, 7, 100] });
    const [cc, channel] = await captured;
    expect(cc).toBe(7);
    expect(channel).toBe(0);
  });

  it("applyMidiMessage dispatches a bound cc to the registered handler", async () => {
    const { learnCC, bindMidi, setMidiTargetHandler, applyMidiMessage } =
      await import("../src/lib/midiLearn");
    const captured = new Promise<[number, number]>((resolve) => {
      const stop = learnCC((cc, channel) => {
        bindMidi({ type: "trackVolume", trackIndex: 0 }, cc, channel);
        resolve([cc, channel]);
        stop();
      });
    });
    await tick();
    input.onmidimessage?.({ data: [0xb0, 7, 100] });
    await captured;

    let received = -1;
    setMidiTargetHandler((_target, value01) => {
      received = value01;
    });
    applyMidiMessage([0xb0, 7, 64]);
    expect(received).toBeCloseTo(64 / 127, 5);
  });

  it("ignores unbound cc messages", async () => {
    const { setMidiTargetHandler, applyMidiMessage } = await import(
      "../src/lib/midiLearn"
    );
    let called = false;
    setMidiTargetHandler(() => {
      called = true;
    });
    applyMidiMessage([0xb0, 99, 100]);
    expect(called).toBe(false);
  });

  it("bindMidi / unbindMidi round-trips through localStorage", async () => {
    const mod = await import("../src/lib/midiLearn");
    mod.bindMidi({ type: "trackPan", trackIndex: 2 }, 12, 0);
    expect(localStorage.getItem("openband_midi_map")).toContain("\"cc\":12");

    vi.resetModules();
    localStorage.getItem("openband_midi_map");
    const reloaded = await import("../src/lib/midiLearn");
    const bindings = reloaded.getBindings();
    expect(bindings.length).toBe(1);
    expect(bindings[0].binding.cc).toBe(12);

    reloaded.unbindMidi(bindings[0].key);
    expect(reloaded.getBindings().length).toBe(0);
  });

  it("applyMcuPreset bulk-binds the MCU surface", async () => {
    const { applyMcuPreset } = await import("../src/lib/mcu");
    const { getBindings } = await import("../src/lib/midiLearn");
    applyMcuPreset();
    const bindings = getBindings();
    expect(bindings.length).toBeGreaterThanOrEqual(12);
    const fader0 = bindings.find(
      (b) => b.binding.target.type === "trackVolume" && b.binding.target.trackIndex === 0,
    );
    expect(fader0).toBeTruthy();
  });
});
