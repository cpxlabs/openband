import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as wasm from "../src/lib/wasmPluginHost";

function loadWasmBytes(): ArrayBuffer {
  const candidates = [
    path.join(process.cwd(), "assets/openband-plugin.wasm"),
    path.join(process.cwd(), "dist/openband-plugin.wasm"),
    path.join(process.cwd(), "wasm/dist/openband-plugin.wasm"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const buf = fs.readFileSync(c);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
  }
  throw new Error("openband-plugin.wasm not found in: " + candidates.join(", "));
}

function instantiate(bytes: ArrayBuffer): WebAssembly.Instance {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod, {
    env: { abort: () => {}, seed: () => 0, trace: () => {} },
  });
}

describe("wasm-plugins: real shipped binary DSP", () => {
  it("produces a valid WebAssembly module exposing the host ABI", () => {
    const bytes = loadWasmBytes();
    expect(WebAssembly.validate(bytes)).toBe(true);
    const inst = instantiate(bytes);
    const ex = inst.exports as any;
    expect(typeof ex.process).toBe("function");
    expect(typeof ex.input_ptr).toBe("function");
    expect(typeof ex.output_ptr).toBe("function");
    expect(typeof ex.alloc).toBe("function");
    expect(ex.param_count()).toBe(1);
    expect(ex.param_default(0)).toBeGreaterThan(0);
  });

  it("alters audio (tanh distortion) instead of pure pass-through", () => {
    const bytes = loadWasmBytes();
    const inst = instantiate(bytes);
    const ex = inst.exports as any;
    const mem = ex.memory as WebAssembly.Memory;
    const f32 = new Float32Array(mem.buffer);
    const ip = ex.input_ptr() as number;
    const op = ex.output_ptr() as number;
    const frames = 6;
    const input = [0.0, 0.5, 1.0, 1.5, -1.0, -2.0];

    for (let i = 0; i < frames; i++) f32[(ip >> 2) + i] = input[i];

    ex.process(frames, 1, ip, op);

    const output: number[] = [];
    for (let i = 0; i < frames; i++) output.push(f32[(op >> 2) + i]);

    const passThrough = input.slice();
    expect(output).not.toEqual(passThrough);
    expect(output[1]).not.toBeCloseTo(passThrough[1], 5);
    expect(Math.abs(output[3])).toBeLessThan(Math.abs(input[3]));
    expect(output[0]).toBeCloseTo(0, 6);
  });
});

describe("wasm-plugins: loader fallback (no binary)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "AudioWorkletNode",
      class {
        port: { onmessage: ((e: any) => void) | null; postMessage: (m: any) => void };
        constructor(_ctx: any, _name: string, _opts: any) {
          this.port = {
            onmessage: null,
            postMessage: (m: any) => {
              if (m && m.type === "init") {
                queueMicrotask(() => {
                  if (this.port.onmessage) {
                    this.port.onmessage({ data: { type: "ready", pluginId: m.pluginId } });
                  }
                });
              }
            },
          };
        }
        connect() {}
        disconnect() {}
      },
    );

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => "blob:mock",
      revokeObjectURL: () => {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loadPlugin resolves a pass-through IPlugin when no WASM bytes are provided", async () => {
    const descriptor: wasm.PluginDescriptor = {
      id: "passthrough-fallback",
      name: "PT",
      version: "1.0.0",
      author: "t",
      category: "Effect",
      inputChannels: 2,
      outputChannels: 2,
      parameters: [],
    };

    const plugin = await wasm.loadPlugin(descriptor, {} as any);
    expect(plugin).toBeDefined();
    expect(plugin.descriptor.id).toBe("passthrough-fallback");
    expect(typeof plugin.setParam).toBe("function");
    expect(typeof plugin.getParam).toBe("function");
    expect(plugin.getParam("missing")).toBe(0);
  });

  it("fetchWasmPlugin fetch failure throws without crashing the loader", async () => {
    const descriptor: wasm.PluginDescriptor = {
      id: "fetch-fallback",
      name: "F",
      version: "1.0.0",
      author: "t",
      category: "Effect",
      inputChannels: 2,
      outputChannels: 2,
      parameters: [],
    };

    await expect(
      wasm.fetchWasmPlugin("https://example.invalid/missing.wasm", descriptor, {} as any),
    ).rejects.toThrow();
  });
});
