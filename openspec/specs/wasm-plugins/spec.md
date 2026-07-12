# WASM Plugins

## Overview
OpenBand hosts DSP plugins and instruments as WebAssembly modules running inside an `AudioWorklet` processor. A JSON-RPC `MessagePort` control protocol bridges the main thread and the worklet; plugin metadata is described by a `PluginDescriptor`. A unified instrument engine provides polyphonic synthesis with presets and a `AudioWorkletNode` front-end. When no `.wasm` binary is shipped, the worklet falls back to a **pass-through** copy of input to output so the graph still runs.

## Implementation Notes
The host framework lives in `src/lib/wasmPluginHost.ts`: `loadPlugin(descriptor, ctx, wasmBytes?)` builds the worklet source (base64 WASM decoded via `atob` + `WebAssembly.instantiate`), wires a `MessagePort` JSON-RPC protocol (`init` / `setParam` / `getParam` / `reset` / `disposed` / `ready` / `paramAck` / `paramValue`), and exposes an `IPlugin` with `setParam` / `getParam` / `reset` / `dispose`. `parsePluginSchema(json)` deserializes a `PluginDescriptor` with sensible defaults (`version: "1.0.0"`, `inputChannels: 2`, `outputChannels: 2`, `category: "Effect"`). `createGenericPluginUI` groups params into a `PluginUIState`. The instrument engine (`src/lib/wasmInstrumentEngine.ts`) exports `INSTRUMENT_PRESETS`, `createUnifiedInstrumentEngine`, and `createWasmInstrumentWorkletNode`. **No real `.wasm` binary is shipped** — `buildPluginUrl` instantiates WASM only when `wasmBytes` is supplied; otherwise the worklet `process` copies `input[ch] -> output[ch]` (pass-through).

## Requirements

### Requirement: WASM Plugin Loader (base64 instantiate)
The system MUST provide `loadPlugin` that, given base64/ArrayBuffer WASM, instantiates it inside the worklet via `WebAssembly.instantiate`, and otherwise runs a pass-through worklet.

#### Scenario: Load with WASM bytes
- **Given** a `PluginDescriptor` and a compiled WASM `ArrayBuffer`
- **When** `loadPlugin(descriptor, ctx, wasmBytes)` is awaited
- **Then** a worklet node boots and resolves a usable `IPlugin`

#### Scenario: Load without WASM (pass-through)
- **Given** a `PluginDescriptor` with no `wasmBytes`
- **When** the worklet `process` runs
- **Then** each output channel mirrors its input channel (no crash, no DSP)

### Requirement: JSON-RPC MessagePort Control Protocol
The system MUST communicate with the worklet exclusively through `PluginMessage` over `port`, supporting `setParam` (acked via `paramAck`) and `getParam` (answered via `paramValue`).

#### Scenario: Set param round-trips
- **Given** a loaded `IPlugin`
- **When** `setParam(id, value)` is called
- **Then** a `setParam` message is posted and a `paramAck` confirms it
- **And** `getParam(id)` returns the last set value from local param state

### Requirement: Descriptor Parsing
The system MUST parse a plugin schema JSON into a `PluginDescriptor`, filling defaults for missing fields.

#### Scenario: Parse minimal schema
- **Given** JSON `{"id":"x","name":"X"}`
- **When** `parsePluginSchema(json)` is called
- **Then** the result has `version: "1.0.0"`, `inputChannels: 2`, `outputChannels: 2`, `category: "Effect"`, `parameters: []`

### Requirement: Generic UI State
The system MUST produce a `PluginUIState` via `createGenericPluginUI(descriptor, paramValues, onParamChange)` grouping params by `group` (default `"General"`).

#### Scenario: Group params
- **Given** a descriptor with params in groups `"A"` and `"B"`
- **When** `createGenericPluginUI` is called
- **Then** `groups` contains both groups with their params
- **And** `paramValues` and `onParamChange` are carried through

### Requirement: Unified Instrument Engine + Worklet Node
The system MUST provide `createUnifiedInstrumentEngine(preset?)` returning a polyphonic engine with `noteOn` / `noteOff` / `render`, defaulting to `INSTRUMENT_PRESETS[0]`, plus `createWasmInstrumentWorkletNode(ctx)` for the worklet front-end.

#### Scenario: Engine default preset
- **Given** no preset argument
- **When** `createUnifiedInstrumentEngine()` is called
- **Then** `getPreset()` deep-equals `INSTRUMENT_PRESETS[0]`

#### Scenario: Render silence with no voices
- **Given** a fresh engine with no `noteOn`
- **When** `render(buf, n)` is called
- **Then** the output buffer is filled with zeros

## Test Requirements (Vitest)
- [ ] `parsePluginSchema` fills defaults for missing descriptor fields
- [ ] `createGenericPluginUI` groups params and preserves values/handler
- [ ] `INSTRUMENT_PRESETS` is non-empty and `createUnifiedInstrumentEngine()` defaults to preset[0]
- [ ] Engine `render` produces zeros with no active voices
- [ ] `loadPlugin` resolves a pass-through `IPlugin` (no WASM provided)
