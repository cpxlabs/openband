# Tasks — Ship a Real WASM Binary

## 1. WASM source + build script
- [ ] Create `wasm/plugin.ts` — AssemblyScript module exporting `param_count`, `param_name`, `param_default`, `alloc`, `process` (first binary: `waveshaper` distortion with one `drive` param via `tanh` curve)
- [ ] Create `wasm/asconfig.json` + `wasm/package.json` with `assemblyscript` dev dep and `build:wasm` (`asc plugin.ts --outFile dist/openband-plugin.wasm --optimize`)
- [ ] Run the WASM build; confirm `wasm/dist/openband-plugin.wasm` is emitted and `WebAssembly.validate` passes

## 2. Asset hosting
- [ ] Copy `wasm/dist/*.wasm` into `assets/` (web) and document the Metro `expo-asset` require path for native
- [ ] Extend `scripts/post-export.js` to copy `*.wasm` into `dist/assets/` so web export serves it
- [ ] (Desktop) resolve packaged path via `OpenBandNative.readFile` / `getAppDataPath`, never `require('fs')`

## 3. Loader wiring (`src/lib/wasmPluginHost.ts`)
- [ ] Add `fetchWasm(url): Promise<ArrayBuffer>` helper
- [ ] Keep `loadPlugin(descriptor, ctx, wasmBytes?)` signature; add `fetchWasmPlugin(url, descriptor, ctx)` convenience that fetches → `loadPlugin`
- [ ] Pass fetched `ArrayBuffer` as `wasmBytes`; base64 path (`wasmB64`) stays supported

## 4. Worklet real-DSP fix (`src/lib/wasmPluginHost.ts` `buildPluginUrl`)
- [ ] On `init`, when `wasmInstance` is live, allocate planar input/output float buffers on the WASM heap via `alloc`
- [ ] In `process`: copy `inputs[0]` → heap input, call `process(nFrames, nChannels, inputPtr, outputPtr)`, copy heap output → `outputs[0]`
- [ ] Preserve the `else` pass-through copy branch as the no-binary fallback

## 5. Test (new)
- [ ] Create `tests/lib_wasm.test.ts`:
  - loads the built binary via `loadPlugin` (or fetched fixture) and processes a nonzero buffer
  - asserts processed output **differs** from the pass-through copy of the same input
  - asserts `loadPlugin` without bytes still resolves a pass-through `IPlugin`

## 6. Spec update
- [ ] Update `openspec/specs/wasm-plugins/spec.md`: record the shipped `openband-plugin.wasm`, add a "Real DSP Execution" requirement with a Scenario asserting processed output differs from pass-through, and mark the "no binary shipped" note resolved
- [ ] Add the new test to the spec's Test Requirements checklist

## 7. Verification
- [ ] `npm run build:wasm` (under `wasm/`) emits valid `dist/openband-plugin.wasm`
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes (incl. `tests/lib_wasm.test.ts`)
- [ ] `npm run build` succeeds and `dist/assets/openband-plugin.wasm` is present in the export
