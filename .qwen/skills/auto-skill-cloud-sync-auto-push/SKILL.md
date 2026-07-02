---
name: cloud-sync-auto-push
description: Pattern for debounced cloud sync auto-push triggered by local project saves in DAW applications
source: auto-skill
extracted_at: '2026-07-02T13:05:00.000Z'
---

## Cloud Sync Auto-Push Pattern

When building a DAW with cloud sync, you want to automatically push project changes to the cloud after local saves — but not on every keystroke. This pattern provides a debounced callback system.

### Step 1: Add Callback to Project Store

```typescript
// In projectStore.ts
let onProjectSaved: ((id: string, project: ProjectData) => void) | null = null;

export function setOnProjectSaved(cb: ((id: string, project: ProjectData) => void) | null): void {
  onProjectSaved = cb;
}

export function saveProject(id: string, data: Omit<ProjectData, "id" | "lastSaved">): void {
  const project = { ...data, id, lastSaved: Date.now() };
  // ... save to localStorage/bridge ...
  onProjectSaved?.(id, project); // Fire callback after successful save
}
```

### Step 2: Create useAutoPush Hook

```typescript
export function useAutoPush(
  enabled: boolean,
  delayMs: number = 3000,
  onPush?: (id: string, project: ProjectData) => void,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: string; project: ProjectData } | null>(null);

  useEffect(() => {
    if (!enabled || !onPush) {
      setOnProjectSaved(null);
      return;
    }

    setOnProjectSaved((id, project) => {
      pendingRef.current = { id, project };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending) {
          onPush(pending.id, pending.project);
          pendingRef.current = null;
        }
      }, delayMs);
    });

    return () => {
      setOnProjectSaved(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, delayMs, onPush]);
}
```

### Step 3: Use in Studio Component

```tsx
function StudioScreen() {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const handlePush = useCallback(async (id: string, project: ProjectData) => {
    try {
      await syncProjectToCloud(id, project);
      showNotification("Project synced to cloud");
    } catch (e) {
      console.error("Cloud sync failed:", e);
    }
  }, []);

  useAutoPush(autoSyncEnabled, 3000, handlePush);
  // ...
}
```

### Key Design Decisions

1. **Debounce, not throttle**: Wait for 3s of inactivity before pushing — avoids pushing on every auto-save during active editing
2. **Only latest project**: If multiple saves happen during the debounce window, only the latest is pushed
3. **Cleanup on unmount**: Timer is cleared and callback is unregistered when component unmounts
4. **Toggle support**: Pass `enabled: false` to disable auto-push (useful for offline mode)
5. **Single callback registration**: Only one callback can be registered at a time — calling `setOnProjectSaved` replaces the previous one

### Testing the Pattern

```typescript
it("fires callback after debounce delay", async () => {
  vi.useFakeTimers();
  const onPush = vi.fn();
  renderHook(() => useAutoPush(true, 3000, onPush));

  saveProject("test-1", { title: "Test", /* ... */ });
  expect(onPush).not.toHaveBeenCalled();

  vi.advanceTimersByTime(3000);
  expect(onPush).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});
```
