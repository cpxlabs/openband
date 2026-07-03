---
name: habbo-studio-virtual-environment
description: Pattern for building 3D virtual studio environments with Three.js — room, furniture, avatars, WebSocket sync, raycasting interaction
source: auto-skill
extracted_at: '2026-07-03T14:11:35.803Z'
---

## Habbo Studio — 3D Virtual Environment Pattern

### Architecture

Build a virtual 3D space where users navigate with WASD, interact with equipment via click, and see other users' avatars in real-time via WebSocket.

### Core Components

**1. Scene Setup**
```ts
// Room with floor, walls, grid, fog, and multi-point lighting
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

**2. Interactive Furniture**
```ts
// Each piece: base (colored box) + top surface + canvas label + glow ring
const group = new THREE.Group();
group.position.set(f.x, 0, f.z);
group.userData = { furnitureId: f.id, route: f.route };

// Canvas label for icon + name
const canvas = document.createElement("canvas");
const texture = new THREE.CanvasTexture(canvas);
const label = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), labelMat);
label.position.y = 1.5;
```

**3. User Avatar**
```ts
// Capsule body + sphere head + name label
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 8, 16), bodyMat);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), headMat);
const nameLabel = new THREE.Mesh(nameGeo, nameMat);
nameLabel.position.y = 1.8; // Always faces camera
```

**4. WASD Movement + Camera Orbit**
```ts
// WASD moves avatar, clamped to room bounds
if (keys.has("w")) avatarGroup.position.z -= moveSpeed * delta;
avatarGroup.position.x = Math.max(-8, Math.min(8, avatarGroup.position.x));

// Right-click drag orbits camera around avatar
cameraAngle.theta -= dx * 0.005;
cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi - dy * 0.005));

// Camera follows avatar
camera.position.x = avatarPos.x + Math.sin(theta) * Math.cos(phi) * distance;
camera.lookAt(avatarPos.x, 0, avatarPos.z);
```

**5. Raycasting Interaction**
```ts
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const handleClick = (event: MouseEvent) => {
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(furnitureMeshes, false);
  if (intersects.length > 0) {
    const route = intersects[0].object.parent?.userData?.route;
    if (route) router.push(route);
  }
};
```

**6. WebSocket Multi-User Sync**
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

**7. Independent Playback Per User**
- Each user's audio plays locally (HTML5 `<audio>` or expo-audio)
- No shared playback state — position, play/pause are independent
- Furniture click opens the tool UI locally, not globally
- WebSocket only syncs avatar positions, not audio state

### Key Patterns

1. **Dynamic Three.js import** — use `await import("three")` or `window.THREE` to handle missing npm package
2. **Canvas labels for text** — create textures from canvas for furniture labels and name tags
3. **Glow ring animation** — `Math.sin(time * 0.002 + i)` for pulsing furniture indicators
4. **Avatar bob** — `Math.sin(time * 0.003) * 0.05` for subtle idle animation
5. **Furniture data array** — define all furniture in a constant array for easy addition/removal
6. **Cleanup on unmount** — cancel animation frame, remove event listeners, dispose renderer

### Backend Integration

Collaboration service (`services/collaboration/main.py`) with Redis:
- Movement messages: forwarded immediately, not persisted (low latency)
- State change messages: persisted to Redis for new joiners
- Room-based WebSocket routing (`/ws/project/{room_id}`)
