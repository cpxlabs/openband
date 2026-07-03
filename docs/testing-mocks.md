# Testing Mocks — Patterns & Pitfalls

## How Mocking Works

Mocks stack in three layers:

1. **`tests/setup.ts`** — global mocks applied before every test file
2. **Per-file `vi.mock()`** — overrides the global mock for that file only
3. **`beforeEach` reconfiguration** — overrides per-file mock return values per test

```
setup.ts (global)  ──►  components.test.tsx (overrides expo-audio)
                     ──►  screens.test.tsx (overrides AuthContext)
```

## Mock Path Convention

All mock paths are relative from the test file (`tests/`) to the source:

```ts
// ✅ Correct
vi.mock("../src/bridge", ...)
vi.mock("../src/lib/masteringSuite", ...)
vi.mock("../src/context/AuthContext", ...)

// ❌ Wrong — creates a dead mock that never intercepts
vi.mock("../bridge", ...)   // resolves to <root>/bridge (doesn't exist)
vi.mock("../lib/foo", ...)  // resolves to <root>/lib/foo (doesn't exist)
```

**Verify mocks are alive**: If tests pass after removing a mock, it was dead.

## The `vi.hoisted` Pattern (for Dynamic Mocks)

When a test needs different mock return values per test case, use `vi.hoisted`:

```ts
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: mockFn,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFn.mockReturnValue({ user: null, signOut: vi.fn() });
});

// in a test:
mockFn.mockReturnValue({ user: { email: "a@b.com" }, signOut: vi.fn() });
```

Rules:
- `vi.hoisted` must be at the top of the file, before any `import` of modules that trigger `vi.mock`
- All mock fns that tests reference must be declared in `vi.hoisted`

### `vi.hoisted` for `react-native` Modules (responsive.test.ts)

When mocking `react-native`'s `useWindowDimensions` (or any hook re-exported from `react-native-web`), the hoisted pattern is **required** to avoid dead mocks:

```ts
// tests/responsive.test.ts — the correct pattern
import { describe, it, expect, vi } from "vitest";
import { useResponsive } from "../src/lib/responsive";
import { renderHook } from "@testing-library/react";

const { mockUseWindowDimensions } = vi.hoisted(() => ({
  mockUseWindowDimensions: vi.fn(),
}));

vi.mock("react-native", () => ({
  useWindowDimensions: mockUseWindowDimensions,
  Platform: { OS: "web" },
}));

describe("useResponsive", () => {
  const setWidth = (width: number) => {
    mockUseWindowDimensions.mockReturnValue({ width, height: 800 });
  };

  it("returns mobile below 480px", () => {
    setWidth(320);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.breakpoint).toBe("mobile");
  });
});
```

**Why this works:** Hoisting `mockUseWindowDimensions` before vitest proxies `react-native` → `react-native-web` ensures the mock intercepts calls from the aliased module. Without hoisting, the `vi.fn()` runs after the alias proxy has already resolved, creating a dead mock that never intercepts.

**What NOT to do:** Do NOT use `importOriginal` for `react-native` modules. The alias chain (`react-native` → `react-native-web`) makes `importOriginal` unreliable — it may resolve to a different module instance than what the SUT imports.

## What Every Export Must Be Mocked

When mocking a module, every export consumed by the component under test must be present:

```ts
// src/lib/masteringSuite.ts exports:
export const MASTERING_PLUGIN_DEFS = [...];       // ← MasteringChain needs this
export function buildMasteringChain(): Plugin[];   // ← MasteringSuite needs this
export function formatFileSize(bytes: number);     // ← MasteringUpload needs this
export function formatBitDepth(d: number);         // ← MasteringSuite needs this

// Mock must include ALL of the above:
vi.mock("../src/lib/masteringSuite", () => ({
  MASTERING_PLUGIN_DEFS: [
    { name: "Parametric EQ", type: "eq", color: "#5ac8fa", description: "..." },
    // ... all 7 items
  ],
  buildMasteringChain: () => [...],
  formatFileSize: (b: number) => `${(b / 1024).toFixed(0)} KB`,
  formatBitDepth: (d: number) => `${d}-bit`,
  createVersion: vi.fn(),
  MasteringInput: class {},
  MasteringSession: class {},
}));
```

Missing exports cause `[vitest] No "X" export is defined on the "..." mock` at runtime.

## Bridged Modules Must Be Complete

The `NativeBridge` interface (`src/bridge/interface.ts`) has 11 methods. When a component calls any of them during render, the mock must provide it:

```ts
vi.mock("../src/bridge", () => ({
  OpenBandNative: {
    showSaveDialog: vi.fn(),
    writeFile: vi.fn(),
    getDocumentsPath: vi.fn(),
    showOpenDialog: vi.fn(),     // needed if component calls it
    listProjects: vi.fn(),       // needed if component calls it
    saveProject: vi.fn(),        // needed if component calls it
    readFile: vi.fn(),           // needed if component calls it
    deleteProject: vi.fn(),
    loadProject: vi.fn(),
    onMenuAction: vi.fn(),
    removeMenuActionListener: vi.fn(),
    getAppDataPath: vi.fn(),
  },
}));
```

## Checklist: Adding Mocks to a New Test File

- [ ] Check `tests/setup.ts` — is the module already globally mocked?
- [ ] List every module imported by the component under test (check actual import statements)
- [ ] For each module, decide: mock or use real?
  - Mock: bridge, external libs (expo-*), context providers
  - Real: pure functions, type definitions, constants
- [ ] Verify mock paths are `../src/<rest-of-path>` (never `../<direct-lib>`)
- [ ] After writing mocks, temporarily delete each one and run tests — if tests still pass, the mock is dead
- [ ] Run `npx vitest run` — zero failures (480 tests across 10 files)
- [ ] Run `npm run test:legacy` — zero failures (24 tests across 2 files)
- [ ] Run `npx tsc --noEmit` — zero errors (frontend AND backend)

## Lessons Learned (from past failures)

| Issue | Symptom | Root Cause | Fix |
|-------|---------|------------|-----|
| **Backend tsc fails (TS1343)** | `import.meta.url` not available in CJS | `backend/src/services/demucs.ts` used ESM-only API in a CJS-compiled file | Replace `import.meta.url` with `__dirname` + `path.join` (or `import.meta.dirname` in Node 20.11+) |
| **Extra brace in master.ts** | Backend tsc: `'}' expected` at end of file | Copy-paste error left a duplicate closing brace after a route handler | Always run `cd backend && npx tsc --noEmit` before committing — frontend tsc does not check backend |
| **`vi.hoisted` fn not hoisted** | Mock dead — tests pass even after removing mock | `vi.hoisted` variable declared after `vi.mock(...)` call | `vi.hoisted` block must be the first statement in the file, before any `vi.mock` or `import` |
| **`importOriginal` silently resolves wrong** | Partial mock doesn't work for `react-native` | Alias proxy resolves `importOriginal` to different instance than what SUT imports | Never use `importOriginal` for aliased modules (`react-native`, `@bridge`) |
| **RWn PointerEvent vs RN GestureResponderEvent** | TypeScript error on `onPointerDown` handler | RNW event types don't match RN's `GestureResponderEvent` | Define local `PointerHandlerArgs` interface, cast via `as` |
| **vitest.config exclude not taking effect** | Legacy node:test file runs in vitest and fails | File not in `exclude` list | Add `.test.ts` files that use `node:test` assertions to `vitest.config.ts` `exclude` |

## `PointerHandlerArgs` Pattern (RNW Pointer Events)

When a component needs to handle pointer/touch events (`onPointerDown`, `onPointerMove`, `onPointerUp`) in a way that works in both RN Web and vitest, define a local interface instead of using RNW's pointer event types:

```tsx
// src/components/PianoRoll.tsx
interface PointerHandlerArgs {
  nativeEvent: { clientX: number; clientY: number; pageX: number; pageY: number };
}

// In the component:
<View
  onPointerDown={(e: unknown) => handlePointerDown(e as PointerHandlerArgs)}
  onPointerMove={(e: unknown) => handlePointerMove(e as PointerHandlerArgs)}
  onPointerUp={() => handlePointerUp()}
  onResponderRelease={() => handlePointerUp()}
/>
```

**Why this works:** RNW's `PointerEvent` type and RN's `GestureResponderEvent` type differ structurally. Using `as PointerHandlerArgs` avoids a type-level conflict between the two event systems. The handler signature only needs `nativeEvent.clientX/Y` and `pageX/Y` — coords that both event systems provide.

## `importOriginal` — When Safe, When Dangerous

`vi.mock(..., async (importOriginal) => { ... })` lets a partial mock re-export real implementations for everything not explicitly overridden.

```ts
// ✅ SAFE — module has no alias chain, no dynamic re-exports
vi.mock("../src/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/constants")>();
  return { ...actual, DEFAULT_BPM: 140 }; // override one export, keep rest real
});
```

```ts
// ❌ DANGEROUS — react-native is aliased (importOriginal resolves differently)
vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  return { ...actual, Platform: { OS: "web" } }; // dead mock or runtime error
});
```

**Rule:** Only use `importOriginal` for project-internal modules (`../src/lib/...`). Never use it for `react-native`, `expo-*`, or any module with a vitest/alias proxy. These modules go through resolution chains that make `importOriginal` resolve to a different instance than what the SUT receives.

## Common RNW Type Mismatches

React Native Web aligns most types with React Native, but some divergences hit at test time:

| RNW Type | RN Equivalent | Mitigation |
|----------|--------------|------------|
| `PointerEvent` (native pointer events) | `GestureResponderEvent` | Define local `PointerHandlerArgs` interface |
| `ViewStyle` from `react-native-web` | `ViewStyle` from `react-native` | Use `ViewStyle` from `react-native`; RNW types extend it |
| `ScrollView` ref type | Slightly different generics | Use `React.RefObject<ScrollView>` from RN, not RNW |
| `TextInput` submit event | `NativeSyntheticEvent<TextInputSubmitEditingEventData>` | Always import event types from `react-native`, not RNW |

**Key principle:** Import types from `react-native`, never from `react-native-web` directly. RNW is the runtime, but RN is the type authority.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Wrong mock path | Tests pass even without the mock | Use `../src/` prefix |
| Missing export | `[vitest] No "X" export is defined` | Add the missing export to the mock |
| Auth context override forgotten | Settings/Account tests break | Use `vi.hoisted` + `beforeEach` |
| Bridge incomplete | `undefined is not a function` at runtime | Add all methods the component calls |
| Static mock where dynamic needed | Can't test different states | Use `vi.hoisted` pattern |
| Duplicate mocks diverge | Subtle test differences across files | Share common mock factory |
