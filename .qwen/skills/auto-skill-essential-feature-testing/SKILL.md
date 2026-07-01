---
name: essential-feature-testing
description: Write comprehensive test cases for essential library features in React Native/Expo audio projects
source: auto-skill
extracted_at: '2026-07-01T14:21:59.046Z'
---

# Essential Feature Testing Workflow

## When to Use
- Adding test coverage for critical library modules without existing tests
- Testing audio DSP, state management, or music theory modules
- Validating complex business logic in isolation

## Procedure

### 1. Analyze Coverage Gaps
```bash
# List all lib files
ls src/lib/*.ts

# Check existing test files
ls tests/*.test.ts
```

Identify modules without test coverage by comparing the two lists.

### 2. Read Source Files
Before writing tests, read each module to understand:
- Exported functions/classes
- Interface definitions
- Dependencies (AudioContext, browser APIs, etc.)
- Edge cases and error handling

### 3. Create Test File Structure
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FunctionA, ClassB } from "../src/lib/moduleName";

// Mock browser/Web Audio APIs
vi.mock("react-native", () => ({
  Platform: { OS: "web", select: (obj: any) => obj.web ?? obj.default },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Clear any module-level state
});

afterEach(() => {
  // Cleanup
});
```

### 4. Mock Global APIs
For audio modules, mock AudioContext and related APIs:

```typescript
function createMockCtx(): AudioContext {
  return {
    currentTime: 0,
    createGain: vi.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: "sine" as OscillatorType,
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    destination: {},
    state: "running" as AudioContextState,
    resume: vi.fn(),
    close: vi.fn(),
  } as unknown as AudioContext;
}
```

### 5. Write Tests by Category

For each module, write tests covering:

**Happy Path:**
- Normal inputs produce expected outputs
- Core functionality works as documented

**Edge Cases:**
- Empty inputs (arrays, objects)
- Null/undefined inputs
- Boundary values (min/max, 0, -1)
- Invalid inputs (unknown IDs, wrong types)

**State Management:**
- Initialization state
- State transitions
- Cleanup/disposal

**Business Logic:**
- Domain-specific validations
- Calculations with expected ranges
- Fallback behaviors

### 6. TypeScript Compliance

When tests reference complex types:
```typescript
// Include all required fields from interfaces
const operation = {
  type: "track.add" as const,
  path: "tracks",
  value: { id: "t1" },
  timestamp: 5,
  id: "op-1",        // Required by CrdtOperation
  userId: "local",   // Required by CrdtOperation
  clientId: "client-1"  // Required by CrdtOperation
};
```

If `instanceof` fails with typed arrays in vitest:
```typescript
// Instead of:
expect(compressed).toBeInstanceOf(Uint8Array);

// Use:
expect(compressed.constructor.name).toBe("Uint8Array");
```

### 7. Verification Checklist

```bash
# Run new tests only
npx vitest run tests/lib4.test.ts

# Run full suite
npx vitest run

# Check TypeScript
npx tsc --noEmit

# Fix any errors before committing
```

### 8. Test Count Guidelines

Aim for comprehensive coverage:
- **Simple utility functions:** 3-5 tests each
- **Classes with state:** 8-12 tests
- **Complex algorithms:** 10-15 tests
- **Data validation:** Test all valid + invalid cases

## Key Patterns Learned

1. **Mock AudioContext fully** - Don't rely on jsdom's partial implementation
2. **Test ranges, not exact values** - For calculations with floating point
3. **Clear module state between tests** - Use `beforeEach`/`afterEach`
4. **Include all interface fields** - TypeScript will catch missing required fields
5. **Test fallback behaviors** - Unknown inputs should not crash

## Example: Testing a DSP Module

```typescript
describe("GainStager", () => {
  it("returns unity gain for empty tracks", () => {
    const stager = new GainStager();
    expect(stager.calculateMasterGain([])).toBe(1);
  });

  it("reduces gain for loud tracks", () => {
    const stager = new GainStager();
    const tracks = [
      { name: "Kick", volume: 120, muted: false, solo: false },
    ];
    const gain = stager.calculateMasterGain(tracks);
    expect(gain).toBeGreaterThanOrEqual(0.1);
    expect(gain).toBeLessThanOrEqual(1);
  });
});
```

## Common Pitfalls

- ** forgetting `as const`** for literal types in test data
- **Incomplete mocks** - Missing methods cause runtime errors
- **Shared state** - Module-level variables persist between tests
- **Exact equality on floats** - Use `toBeCloseTo` or range checks
