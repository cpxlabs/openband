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
- [ ] Run `npx vitest run` — zero failures
- [ ] Run `npx tsc --noEmit` — zero errors

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Wrong mock path | Tests pass even without the mock | Use `../src/` prefix |
| Missing export | `[vitest] No "X" export is defined` | Add the missing export to the mock |
| Auth context override forgotten | Settings/Account tests break | Use `vi.hoisted` + `beforeEach` |
| Bridge incomplete | `undefined is not a function` at runtime | Add all methods the component calls |
| Static mock where dynamic needed | Can't test different states | Use `vi.hoisted` pattern |
| Duplicate mocks diverge | Subtle test differences across files | Share common mock factory |
