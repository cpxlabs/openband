# Proposal — Ship a Real WASM Binary

## Context
`src/lib/wasmPluginHost.ts` and `src/lib/wasmInstrumentEngine.ts` implement a complete WASM hosting framework: a base64/AudioWorklet loader (`buildPluginUrl` → `WebAssembly.instantiate`), a JSON-RPC `MessagePort` control protocol (`init` / `setParam` / `getParam` / `reset` / `ready` / `paramAck` / `paramValue`), descriptor parsing (`parsePluginSchema`), and a unified polyphonic instrument engine + worklet (`createWasmInstrumentWorkletNode`). **But no `.wasm` binary is shipped.** When `loadPlugin` is called without `wasmBytes`, the worklet `process` just copies `input[ch] → output[ch]` (pass-through). `openspec/specs/wasm-plugins/spec.md` documents this gap explicitly: "No real `.wasm` binary is shipped."

## Problem Description
- The DSP offload story is incomplete. The loader, protocol, and worklet scaffolding exist but never execute real native DSP — every plugin currently runs as a silent pass-through.
- The worklet's WASM call path is also broken for real binaries: `process` only invokes `this._wasmInstance.exports.process(...)` when `this._inputPtrs` / `this._outputPtrs` are populated, but those arrays are **never allocated** (they remain `[]`), so even a shipped binary would do nothing.
- The repo has no build step that emits a `.wasm` artifact, and no convention for hosting/loading a static binary across web export, Metro native, and the Electron/Tauri desktop bridge.

## Objectives
- Add a WASM source tree (`wasm/`) plus a build script that emits a real `dist/*.wasm` artifact (recommend **AssemblyScript** for the smallest toolchain and TS-like authoring; a tiny example DSP — a `waveshaper`/`distortion` or a single synth voice — as the first shipped binary).
- Host the artifact as a static asset and load it through `wasmPluginHost` (fetch + base64, or fetch → `ArrayBuffer`), keeping the existing pass-through as the no-binary fallback.
- Fix the worklet so real binaries actually process audio: allocate input/output float buffers on the WASM heap, copy samples in, call `process`, copy samples out.
- Add a test proving the shipped binary changes an audio buffer (output differs from pass-through).
- Update `openspec/specs/wasm-plugins/spec.md` to record the now-shipped binary and the real-DSP requirement.

## Out of Scope
- No new plugin *types* or UI rewrites of `PluginEditor.tsx` / `PluginUI.tsx` beyond what loading a real binary requires.
- No Rust/C++ toolchain migration (AssemblyScript only); multiple production DSP modules are a later change.
- No backend (Demucs/Express) changes — WASM is purely client-side AudioWorklet DSP.
- No modification of `package.json` build scripts, `metro.config.js`, `babel.config.js`, or `tailwind.config.js` is permitted by this change's constraints; the new WASM build script lives under `wasm/` (`wasm/package.json` / `wasm/asconfig.json`) and is wired as an optional pre-step, not a forced change to root scripts.
