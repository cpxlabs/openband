# OpenSpec Design: Unified Audio Transport & Studio Shell Integration

This document outlines the detailed design, state flow, and component layout for the transport controls and responsive shell integration in the DAW Studio.

---

## 1. Component Layout (Desktop vs Mobile)

### Desktop Layout (`isDesktop` = true)
```text
+---------+--------------------------------------------------------+
|         | Studio Header: Transport, Metronome, Mixes, Synth, etc.|
|         +--------------------------------------------------------+
| Sidebar |                                                        |
|  Menu   | DAW Tracks & Timeline Grid                             |
|         |                                                        |
|         +--------------------------------------------------------+
|         | Bottom Tab Content (Mixer, FX, Chords, etc.)           |
+---------+--------------------------------------------------------+
```

### Mobile Layout (`isDesktop` = false)
```text
+------------------------------------------------------------------+
| ☰  ⏮  ▶/⏸  ⏹  ⏭   00:00 / 02:40                                   |
+------------------------------------------------------------------+
| DAW Tracks & Timeline Grid                                       |
|                                                                  |
|                                                                  |
+------------------------------------------------------------------+
| Bottom Tab Selection List & Content                              |
+------------------------------------------------------------------+
```

---

## 2. Layout Integration Implementation

### 2.1. State Variable
- `const [drawerOpen, setDrawerOpen] = useState(false);`

### 2.2. Desktop Sidebar Wrapper
```typescript
return (
  <View className="flex-1 bg-dark-bg flex-row select-none">
    {resp.isDesktop && (
      <Sidebar
        currentRoute="studio"
        onNavigate={handleNavigate}
        isOpen
        onClose={() => {}}
        isPersistent
      />
    )}
    <View className="flex-1">
      {/* Studio Header & Body */}
    </View>
  </View>
);
```

### 2.3. Mobile Drawer Overlay
When `drawerOpen` is `true`, render the exact side-sliding drawer menu container as a sibling to the main studio content, absolute positioned with `z-50`.
Inside the drawer, mapping the navigation items to `handleNavigate`:
```typescript
const handleNavigate = useCallback((route: string) => {
  const target = route === "index" ? "/tabs/feed" : `/tabs/${route}`;
  router.push(target as Href);
  setDrawerOpen(false);
}, [router]);
```
