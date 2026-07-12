export interface PluginParameter {
  id: string;
  name: string;
  type: "float" | "int" | "bool" | "enum";
  min: number;
  max: number;
  default: number;
  step?: number;
  enumValues?: string[];
  unit?: string;
  group?: string;
}

export interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  author: string;
  parameters: PluginParameter[];
  inputChannels: number;
  outputChannels: number;
  category: string;
}

export interface IPlugin {
  descriptor: PluginDescriptor;
  process(input: Float32Array[], output: Float32Array[], params: Record<string, number>): void;
  setParam(id: string, value: number): void;
  getParam(id: string): number;
  reset(): void;
  dispose(): void;
}

export interface PluginMessage {
  type: "init" | "process" | "setParam" | "getParam" | "reset" | "disposed" | "error" | "ready" | "descriptor" | "paramAck" | "paramValue";
  pluginId: string;
  params?: Record<string, number>;
  bufferSize?: number;
  sampleRate?: number;
  paramId?: string;
  paramValue?: number;
  descriptor?: PluginDescriptor;
  error?: string;
}

interface LoadedPlugin {
  descriptor: PluginDescriptor;
  workletNode: AudioWorkletNode;
  port: MessagePort;
  paramValues: Map<string, number>;
  paramListeners: Map<string, Set<(v: number) => void>>;
  ready: boolean;
}

const loadedPlugins = new Map<string, LoadedPlugin>();

function buildPluginUrl(pluginId: string, _wasmBytes?: ArrayBuffer): string {
  const code = `
    class PluginProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this._ready = false;
        this._pluginId = "${pluginId}";
        this._params = {};
        this._wasmInstance = null;
        this._heapF32 = null;
        this._inputPtrs = [];
        this._outputPtrs = [];
        this._inputPtr = 0;
        this._outputPtr = 0;

        this.port.onmessage = (e) => {
          const msg = e.data;
          switch (msg.type) {
            case "init":
              this._initPlugin(msg);
              break;
            case "setParam":
              this._params[msg.paramId] = msg.paramValue;
              this.port.postMessage({ type: "paramAck", pluginId: this._pluginId, paramId: msg.paramId, value: msg.paramValue });
              break;
            case "getParam":
              this.port.postMessage({ type: "paramValue", pluginId: this._pluginId, paramId: msg.paramId, value: this._params[msg.paramId] ?? 0 });
              break;
            case "reset":
              this._params = {};
              break;
          }
        };
      }

      async _initPlugin(msg) {
        if (msg.wasmB64) {
          try {
            const bytes = Uint8Array.from(atob(msg.wasmB64), c => c.charCodeAt(0));
            const module = await WebAssembly.instantiate(bytes, {
              env: {
                memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
                abort: () => {},
                seed: () => 0,
                trace: () => {},
              },
            });
            this._wasmInstance = module.instance;
            this._heapF32 = new Float32Array(this._wasmInstance.exports.memory.buffer);

            this._inputPtr = this._wasmInstance.exports.input_ptr?.() ?? 0;
            this._outputPtr = this._wasmInstance.exports.output_ptr?.() ?? 0;

            const paramCount = this._wasmInstance.exports.param_count?.() ?? 0;
            for (let i = 0; i < paramCount; i++) {
              const namePtr = this._wasmInstance.exports.param_name?.(i) ?? 0;
              const name = this._readString(namePtr);
              this._params[name] = this._wasmInstance.exports.param_default?.(i) ?? 0;
            }
          } catch (err) {
            console.error("Plugin WASM init failed:", err);
          }
        }

        this._ready = true;
        this.port.postMessage({ type: "ready", pluginId: this._pluginId });
      }

      _readString(ptr) {
        if (!this._heapF32 || !ptr) return "";
        const heap = new Uint8Array(this._wasmInstance.exports.memory.buffer);
        let end = ptr;
        while (heap[end] !== 0) end++;
        return new TextDecoder().decode(heap.slice(ptr, end));
      }

      process(inputs, outputs, params) {
        if (!this._ready || !inputs.length || !outputs.length) return true;

        const input = inputs[0];
        const output = outputs[0];

        if (this._wasmInstance && this._heapF32 && this._inputPtr && this._outputPtr) {
          const numChannels = Math.max(input.length, output.length);
          const numFrames = output[0]
            ? output[0].length
            : (input[0] ? input[0].length : 0);

          if (numFrames > 0 && numFrames * numChannels <= 8192 * 8) {
            const heap = this._heapF32;
            const inBase = this._inputPtr >> 2;
            const outBase = this._outputPtr >> 2;

            for (let ch = 0; ch < numChannels; ch++) {
              const inCh = input[ch];
              const base = inBase + ch * numFrames;
              for (let i = 0; i < numFrames; i++) {
                heap[base + i] = inCh ? inCh[i] : 0;
              }
            }

            this._wasmInstance.exports.process(numFrames, numChannels, this._inputPtr, this._outputPtr);

            for (let ch = 0; ch < numChannels; ch++) {
              const outCh = output[ch];
              if (outCh) {
                const base = outBase + ch * numFrames;
                for (let i = 0; i < numFrames; i++) {
                  outCh[i] = heap[base + i];
                }
              }
            }

            return true;
          }
        }

        for (let ch = 0; ch < output.length; ch++) {
          if (input[ch]) {
            output[ch].set(input[ch]);
          } else {
            output[ch].fill(0);
          }
        }

        return true;
      }
    }

    registerProcessor("${pluginId}-processor", PluginProcessor);
  `;

  const blob = new Blob([code], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

function waitForWorkletMessage(
  port: MessagePort,
  messageType: string,
  timeout: number = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      port.onmessage = null;
      reject(new Error(`Timeout waiting for ${messageType}`));
    }, timeout);

    port.onmessage = (e) => {
      if (e.data.type === messageType) {
        clearTimeout(timer);
        port.onmessage = null;
        resolve(e.data);
      }
    };
  });
}

export async function loadPlugin(
  descriptor: PluginDescriptor,
  ctx: AudioContext,
  wasmBytes?: ArrayBuffer,
  outputNode?: AudioNode,
): Promise<IPlugin> {
  if (loadedPlugins.has(descriptor.id)) {
    return loadedPlugins.get(descriptor.id) as unknown as IPlugin;
  }

  const url = buildPluginUrl(descriptor.id, wasmBytes);

  const workletNode = new AudioWorkletNode(ctx as unknown as globalThis.AudioContext, `${descriptor.id}-processor`, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: descriptor.inputChannels,
    channelCountMode: "explicit",
    outputChannelCount: [descriptor.outputChannels],
  });

  URL.revokeObjectURL(url);

  const port = workletNode.port;

  const paramValues = new Map<string, number>();
  const paramListeners = new Map<string, Set<(v: number) => void>>();

  for (const p of descriptor.parameters) {
    paramValues.set(p.id, p.default);
    paramListeners.set(p.id, new Set());
  }

  const loaded: LoadedPlugin = {
    descriptor,
    workletNode,
    port,
    paramValues,
    paramListeners,
    ready: false,
  };

  loadedPlugins.set(descriptor.id, loaded);

  if (outputNode) {
    workletNode.connect(outputNode);
  }

  port.onmessage = (e) => {
    const msg = e.data as PluginMessage;
    if (msg.type === "ready") {
      loaded.ready = true;
    }
    if (msg.type === "paramAck") {
      const listeners = loaded.paramListeners.get(msg.paramId!);
      if (listeners) {
        for (const cb of listeners) cb(msg.paramValue!);
      }
    }
  };

  port.postMessage({
    type: "init",
    pluginId: descriptor.id,
    wasmB64: wasmBytes ? btoa(String.fromCharCode(...new Uint8Array(wasmBytes))) : undefined,
  } as PluginMessage);

  await waitForWorkletMessage(port, "ready", 10000);

  return {
    descriptor,
    process: (_input: Float32Array[], _output: Float32Array[], _params: Record<string, number>) => {},
    setParam(id: string, value: number) {
      paramValues.set(id, value);
      port.postMessage({ type: "setParam", pluginId: descriptor.id, paramId: id, paramValue: value } as PluginMessage);
    },
    getParam(id: string): number {
      return paramValues.get(id) ?? 0;
    },
    reset() {
      port.postMessage({ type: "reset", pluginId: descriptor.id } as PluginMessage);
      for (const [id] of paramValues) {
        const p = descriptor.parameters.find((pp) => pp.id === id);
        if (p) paramValues.set(id, p.default);
      }
    },
    dispose() {
      port.postMessage({ type: "disposed", pluginId: descriptor.id } as PluginMessage);
      workletNode.disconnect();
      loadedPlugins.delete(descriptor.id);
    },
  };
}

export async function fetchWasm(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch WASM at ${url}: ${res.status}`);
  }
  return res.arrayBuffer();
}

export async function fetchWasmPlugin(
  url: string,
  descriptor: PluginDescriptor,
  ctx: AudioContext,
  outputNode?: AudioNode,
): Promise<IPlugin> {
  const bytes = await fetchWasm(url);
  return loadPlugin(descriptor, ctx, bytes, outputNode);
}

export function unloadPlugin(pluginId: string): void {
  const loaded = loadedPlugins.get(pluginId);
  if (loaded) {
    loaded.port.postMessage({ type: "disposed", pluginId } as PluginMessage);
    loaded.workletNode.disconnect();
    loadedPlugins.delete(pluginId);
  }
}

export function getLoadedPlugin(pluginId: string): LoadedPlugin | null {
  return loadedPlugins.get(pluginId) ?? null;
}

export function disposeAllPlugins(): void {
  for (const [id] of loadedPlugins) {
    unloadPlugin(id);
  }
}

export function createGenericPluginUI(
  descriptor: PluginDescriptor,
  paramValues: Record<string, number>,
  onParamChange: (paramId: string, value: number) => void,
): PluginUIState {
  return {
    descriptor,
    paramValues,
    groups: groupParameters(descriptor.parameters),
    onParamChange,
  };
}

function groupParameters(params: PluginParameter[]): Map<string, PluginParameter[]> {
  const groups = new Map<string, PluginParameter[]>();
  for (const p of params) {
    const group = p.group ?? "General";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(p);
  }
  return groups;
}

export interface PluginUIState {
  descriptor: PluginDescriptor;
  paramValues: Record<string, number>;
  groups: Map<string, PluginParameter[]>;
  onParamChange: (paramId: string, value: number) => void;
}

export function parsePluginSchema(schemaJson: string): PluginDescriptor {
  const raw = JSON.parse(schemaJson) as Record<string, unknown>;
  return {
    id: raw.id as string,
    name: raw.name as string,
    version: (raw.version as string) ?? "1.0.0",
    author: (raw.author as string) ?? "Unknown",
    parameters: (raw.parameters as PluginParameter[]) ?? [],
    inputChannels: (raw.inputChannels as number) ?? 2,
    outputChannels: (raw.outputChannels as number) ?? 2,
    category: (raw.category as string) ?? "Effect",
  };
}
