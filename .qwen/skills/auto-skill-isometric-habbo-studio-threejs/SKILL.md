---
name: isometric-habbo-studio-threejs
description: Three.js isometric Habbo-style virtual studio — OrthographicCamera, MeshToonMaterial furniture, Raycaster selection, HTML overlay tools, CDN fallback chain, sidebar sub-item navigation
source: auto-skill
extracted_at: '2026-07-03T14:51:58.303Z'
---

## Three.js CDN Fallback Chain

**CRITICAL:** Three.js must load via CDN, not bundled. Version 0.160.0 is the latest confirmed available across all three CDNs.

```ts
const THREE_CDNS = [
  "https://unpkg.com/three@0.160.0/build/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
];
```

Always verify CDN availability with `curl -sI <url>` before assuming a version exists. Version 0.170.0 returned 404 on all CDNs.

## Virtual Studio Setup (merged from habbo-studio-virtual-environment)

### Scene Architecture

**Room Setup:**
```ts
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.Fog(0x0a0a0f, 20, 40);

// Floor + grid
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(20, 20, 0x2a2a4e, 0x1a1a2e));

// Multi-point lighting (ambient + directional + fill + rim)
```

### Camera (Orthographic for isometric view)
```ts
const aspect = window.innerWidth / window.innerHeight
const d = 10 // Zoom level
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000)
camera.position.set(10, 10, 10)
camera.lookAt(0, 0, 0)
```

### Renderer (Pixel art style, no antialiasing)
```ts
const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.textureFormat = THREE.NearestFilter
```

### Furniture Creation (MeshToonMaterial for cartoon look)
```ts
const geometry = new THREE.BoxGeometry(2, 1, 2)
const material = new THREE.MeshToonMaterial({ color: 0x4444ff })
const mixer = new THREE.Mesh(geometry, material)
mixer.name = "mixer_tool" // For Raycaster identification
scene.add(mixer)
```

### Furniture Definition Pattern
```ts
interface FurnitureDef {
  id: string;
  name: string;
  icon: string;
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  color: string;
  route: string;  // Route to navigate when clicked
}
```

Each furniture piece maps to a real app route (e.g., `/studio`, `/mastering`).

### Raycaster Click Detection
```ts
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(furnitureMeshes, false)
  if (intersects.length > 0) {
    const hit = intersects[0].object
    const found = FURNITURE.find(f => f.id === hit.userData.furnitureId)
    setSelectedFurniture(found ?? null)
  }
})
```

### WASD Movement
```ts
const keys = new Set<string>()
const handleKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase())
const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
// In animate loop: update avatarGroup.position based on keys set
```

### User Avatar Pattern
```ts
// Capsule body + sphere head + name label
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 8, 16), bodyMat);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), headMat);
const nameLabel = new THREE.Mesh(nameGeo, nameMat);
nameLabel.position.y = 1.8; // Always faces camera
```

### WebSocket Multi-User Sync
```ts
const ws = new WebSocket(`ws://localhost:8001/ws/project/studio-room`);
ws.onopen = () => ws.send(JSON.stringify({ type: "join", userId, x: 0, z: 0 }));
// Broadcast position on movement
ws.send(JSON.stringify({ type: "movement", userId, x, z }));
// Receive other users' positions
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "state_change" && msg.data?.avatars) {
    // Update other avatars in scene
  }
};
```

### Key Patterns
- **Independent playback per user** — each user's audio plays locally, furniture click opens tool UI locally
- **WebSocket only syncs avatar positions, not audio state**
- **Dynamic Three.js import** — use `await import("three")` or `window.THREE`
- **Canvas labels for text** — create textures from canvas for furniture labels and name tags
- **Glow ring animation** — `Math.sin(time * 0.002 + i)` for pulsing furniture indicators
- **Avatar bob** — `Math.sin(time * 0.003) * 0.05` for subtle idle animation
- **Cleanup on unmount** — cancel animation frame, remove event listeners, dispose renderer

### UI Pattern: Selected Furniture Overlay
- When user clicks furniture via Raycaster, show overlay card with icon, name, Open/Close buttons
- Open navigates to `router.push(furniture.route)`
- Close dismisses overlay
- Controls hint shown at bottom: "WASD to move • Click furniture to open"

### Sidebar Sub-Item Navigation
Each furniture station appears as a sub-item under "3D Studio" in the Sidebar:

```ts
{
  key: "virtual-studio",
  label: "3D Studio",
  icon: "🏠",
  subItems: [
    { key: "mixer", label: "Mixing Console", icon: "🎛", route: "/studio" },
    { key: "mastering-3d", label: "Mastering Suite", icon: "🎚", route: "/mastering" },
    { key: "piano-roll", label: "Piano Roll", icon: "🎹", route: "/studio" },
    // ...
  ],
}
```

Sidebar uses `useState<Set<string>>` for expand/collapse state. Parent item toggles expansion; clicking sub-item calls `onNavigate(sub.key)`.

### Testing Pattern
```tsx
it("renders 3D Studio with sub-items expanded by default", () => {
  render(<Sidebar currentRoute="virtual-studio" ... />);
  expect(screen.getByText("3D Studio")).toBeTruthy();
  expect(screen.getByText("Mixing Console")).toBeTruthy();
});

it("calls onNavigate with sub-item key when pressed", () => {
  const fn = vi.fn();
  render(<Sidebar currentRoute="virtual-studio" onNavigate={fn} ... />);
  fireEvent.click(screen.getByText("Piano Roll"));
  expect(fn).toHaveBeenCalledWith("piano-roll");
});
```

## Why This Matters
Transforms the DAW from a flat UI into an immersive 3D space where navigation happens both spatially (click furniture in room) and structurally (sidebar sub-items). The CDN fallback chain is critical — Three.js versions may disappear from CDNs, so always verify before updating.
