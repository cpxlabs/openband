---
name: isometric-habbo-studio-threejs
description: Three.js isometric Habbo-style virtual studio — OrthographicCamera, MeshToonMaterial furniture, Raycaster selection, HTML overlay tools
source: auto-skill
extracted_at: '2026-07-03T14:51:58.303Z'
---

## Three.js Isometric Virtual Studio Setup

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

### Raycaster Click Detection
```ts
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(scene.children)
  if (intersects.length > 0) {
    const toolName = intersects[0].object.name
    // Open corresponding HTML overlay
  }
})
```

### UI Pattern: HTML Overlays (Don't navigate away)
- When user clicks furniture via Raycaster, pause camera movement
- Overlay a `<div>` (Tailwind/CSS) on top of the canvas
- Keeps the "room" feeling while interacting with complex tools
- Each tool (Mixer, Mastering, Piano Roll) is a separate overlay component

### Backend Integration
- FastAPI microsserviços process audio commands
- WebSockets for real-time collaboration
- Each tool overlay sends commands via WS to backend
- Backend processes audio and returns state updates

## Why This Matters
Transforms the DAW from a flat UI into an immersive 3D space where collaboration happens naturally. OrthographicCamera gives the classic Habbo Hotel isometric view, while HTML overlays keep complex tools usable without sacrificing 3D immersion.
