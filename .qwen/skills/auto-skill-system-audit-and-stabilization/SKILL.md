---
name: system-audit-and-stabilization
description: Patterns for systematic codebase audit and stabilization — P0-P4 prioritization, provider function stabilization, WebSocket backoff
source: auto-skill
extracted_at: '2026-07-02T13:11:49.925Z'
---

## Systematic audit workflow

When auditing a codebase for system improvements, use this **P0-P4 prioritization framework**:

| Priority | Category | What to look for | Fix urgency |
|----------|----------|------------------|-------------|
| **P0** | Memory leaks / resource exhaustion | Blob URLs without revoke, event listeners without cleanup, intervals without clear, AudioBuffer never released | Fix immediately |
| **P1** | Error handling / type safety | `any` types, empty `catch {}` blocks, `console.warn` without user feedback on critical operations | Fix next |
| **P2** | Performance / correctness | Unmemoized provider functions causing consumer re-renders, singleton mutable state, fixed reconnect intervals | Fix after P1 |
| **P3** | Accessibility | Missing `accessibilityLabel`, no keyboard navigation, canvas without `role="img"` | Fix if time |
| **P4** | Security | Worker blob templates with user interpolation, fabricated auth tokens | Document and monitor |

### Blob URL leak pattern

Every `URL.createObjectURL()` must have a corresponding `URL.revokeObjectURL()`. The safest pattern:

```tsx
// Correct: store URL, revoke after use
const blob = new Blob([data], { type: "application/json" })
const url = URL.createObjectURL(blob)
const a = document.createElement("a")
a.href = url
a.download = filename
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url) // MUST come after click
```

For long-lived blob URLs (e.g., audio playback), track them in a ref and revoke on unmount:

```tsx
const blobUrlRef = useRef<string | null>(null);

useEffect(() => {
  return () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  };
}, []);
```

## Context provider function stabilization

When functions are defined inside a React context provider body without `useCallback`, **every consumer of that context re-renders on every provider render**, even if their specific dependency hasn't changed.

### Wrong (causes cascading re-renders)
```tsx
function AudioEngineProvider({ children }) {
  const stop = () => { /* ... */ };           // new function every render
  const play = (tracks, bpm) => { /* ... */ }; // new function every render
  return <Ctx.Provider value={{ stop, play }}>{children}</Ctx.Provider>;
}
```

### Correct (stable references)
```tsx
function AudioEngineProvider({ children }) {
  const stop = useCallback(() => { /* ... */ }, []);
  const play = useCallback((tracks, bpm) => { /* ... */ }, []);
  return <Ctx.Provider value={{ stop, play }}>{children}</Ctx.Provider>;
}
```

**Rule:** Every function exposed through a context provider value should be wrapped in `useCallback` with an appropriate dependency array. If the function only uses refs and state setters, the deps array is `[]`.

## WebSocket reconnection with exponential backoff

Fixed-interval reconnection creates unnecessary load when the server is down. Use exponential backoff with a ceiling:

```ts
let reconnectAttempts = 0;

ws.onopen = () => {
  reconnectAttempts = 0; // reset on successful connection
};

ws.onclose = () => {
  const backoff = Math.min(3000 * Math.pow(2, reconnectAttempts), 60000); // 3s → 60s max
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => reconnect(), backoff);
};
```

**Parameters:**
- Base delay: 3000ms (3 seconds)
- Multiplier: 2 (doubles each attempt)
- Ceiling: 60000ms (60 seconds max)
- Reset: on `onopen` (successful reconnection)

## Empty catch block fix

Never use empty `catch {}` blocks. At minimum, add a `console.warn`:

```tsx
// Wrong
try { localStorage.setItem(key, value); } catch {}

// Correct
try { localStorage.setItem(key, value); } catch (e) {
  console.warn("Storage save failed:", e);
}
```

For user-facing critical operations (project save, audio export, mixdown), also show an `Alert.alert()` or toast alongside the console warning.
