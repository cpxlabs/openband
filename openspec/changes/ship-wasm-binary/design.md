# Design — Ship a Real WASM Binary

## File / Area Mapping

| Concern | File Touched | Notes |
|---|---|---|
| WASM source | `wasm/plugin.ts` (new) | AssemblyScript DSP (first binary: `waveshaper` distortion) |
| WASM build script | `wasm/package.json`, `wasm/asconfig.json` (new) | `asc` compile → `dist/openband-plugin.wasm` |
| Binary hosting | `assets/` (or `public/`) + `scripts/post-export.js` | Copy `dist/*.wasm` into the web `dist/` output; Metro `expo-asset` for native |
| Loader wiring | `src/lib/wasmPluginHost.ts` | Add `fetchWasm(path)` → `ArrayBuffer`; pass into `loadPlugin`; keep `wasmBytes?` optional |
| Worklet DSP fix | `src/lib/wasmPluginHost.ts` (`buildPluginUrl` worklet) | Allocate heap buffers, copy in/out, call `process` |
| Spec update | `openspec/specs/wasm-plugins/spec.md` | Record shipped binary + real-DSP requirement + scenario |
| Test | `tests/lib_wasm.test.ts` (new) | WASM loads and alters buffer vs pass-through |

## WASM Source + Build

- New directory `wasm/` containing an AssemblyScript module, e.g. a `waveshaper` that applies a `tanh`-based drive curve plus a single `drive` parameter:
  - Exports expected by the existing host ABI: `param_count() -> i32`, `param_name(i32) -> i32` (ptr), `param_default(i32) -> f32`, `alloc(i32) -> i32` (heap allocate), and `process(numFrames: i32, numChannels: i32, inputPtr: i32, outputPtr: i32)`.
  - Internally uses a linear-memory float buffer; `process` reads `inputPtr` (interleaved or planar), applies `tanh(x * drive)`, writes `outputPtr`.
- Build via AssemblyScript compiler (`asc`): `wasm/package.json` script `build: "asc plugin.ts --outFile dist/openband-plugin.wasm --optimize"`. Output lands in `wasm/dist/`, then copied to the app asset root so the web bundle and native asset catalog pick it up.
- Rationale for AssemblyScript over Rust/C++: near-zero new toolchain (npm-only `assemblyscript` dev dep), TS-like syntax matching the repo, and tiny emitted binaries (< 10 KB) that embed cleanly as base64 or fetch from a static path.

## Asset Hosting + Bundler Concerns

- **Web (`expo export --platform web`):** static files under `assets/` are copied by `scripts/post-export.js` into `dist/assets/`. Add a copy step for `wasm/dist/*.wasm` so the runtime can `fetch('/assets/openband-plugin.wasm')` at worklet-init time. `dist/` is gitignored, so the `.wasm` is a build artifact, never committed.
- **Native (Metro):** Metro does not bundle `.wasm` by default. Use `expo-asset` (`Asset.fromModule(require('../assets/openband-plugin.wasm'))`) to resolve a local URI, then read bytes via `fetch(uri)` → `ArrayBuffer`. The `wasmPluginHost` loader already accepts an `ArrayBuffer`, so no API change is needed for native — only the resolution path.
- **Desktop (Electron/Tauri via `OpenBandNative`):** native assets can be read with `OpenBandNative.readFile(path)` returning `ArrayBuffer`. Path resolved from `getAppDataPath()` / packaged `extraResources`. Follows the existing "all native I/O through the bridge" rule — frontend must not `require('fs')`.
- The loader keeps **both** modes: `loadPlugin(descriptor, ctx, wasmBytes?)` continues to accept an in-memory `ArrayBuffer` (embedded base64 still supported via `wasmB64`), and gains a companion `fetchWasmPlugin(url)` that fetches → `ArrayBuffer` → `loadPlugin`. Pass-through remains the fallback when no bytes resolve.

## Worklet DSP Wiring (the fix)

Current `buildPluginUrl` worklet only calls `process` when `this._inputPtrs`/`this._outputPtrs` are set — but they are never allocated, so real DSP is a no-op. Correct flow:

1. On `init` with a live `wasmInstance`, allocate two planar float buffers on the WASM heap via `alloc(nFrames * nChannels * 4)` → store base ptrs in `this._inputPtrs`/`this._outputPtrs`.
2. In `process(inputs, outputs)`: copy `inputs[0][ch][i]` into the heap input buffer, call `process(nFrames, nChannels, inputPtr, outputPtr)`, then copy heap output buffer back into `outputs[0][ch]`.
3. Leave the `else` branch (pass-through copy `input[ch] → output[ch]`) intact as the no-binary fallback.

This keeps the existing JSON-RPC surface identical — only the worklet's internal DSP execution becomes real.

## Verification

- `wasm/dist/openband-plugin.wasm` exists after the WASM build step.
- `npx tsc --noEmit` clean (root + backend).
- `npx vitest run` passes, including `tests/lib_wasm.test.ts`.
- New test `tests/lib_wasm.test.ts`: load the built binary (or a fetched fixture) via `loadPlugin`, feed a nonzero buffer, assert the processed output **differs** from the pass-through copy of the same input (e.g. distortion changes sample magnitudes).
- `npm run build` succeeds and `dist/assets/openband-plugin.wasm` is present in the export output.
- WASM build (`npm run build:wasm` under `wasm/`) emits a valid module that `WebAssembly.validate` accepts.
