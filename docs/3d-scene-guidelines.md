# 3D Studio Scenes: Agent Guidelines

To maintain visual consistency, performance, and a premium aesthetic across all 3D studio environments (e.g., `virtual-studio.tsx`, `vocal-booth.tsx`, `dj-stage.tsx`, etc.), AI agents must adhere to the following implementation rules.

## 1. Renderer Configuration

Always configure the `WebGLRenderer` for high fidelity and performance:

```javascript
const renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  powerPreference: "high-performance" 
});
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Tone Mapping for cinematic lighting
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; // Adjust between 1.0 - 1.3 per scene

// Shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

## 2. Lighting & Shadows

Scenes must look grounded. Lighting is critical.
- **Key Lights:** The primary light source (e.g., `SpotLight`, `DirectionalLight`) MUST cast shadows (`light.castShadow = true`).
- **Shadow Maps:** Configure shadow bounds and bias carefully to avoid artifacting:
  ```javascript
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0005;
  ```
- **Floor:** The ground plane MUST receive shadows (`floor.receiveShadow = true`).
- **Objects:** All primary physical objects and furniture MUST cast and receive shadows (`mesh.castShadow = true; mesh.receiveShadow = true;`).

## 3. Materials

- **Use PBR Materials:** Prefer `MeshStandardMaterial` or `MeshPhysicalMaterial` over `MeshBasicMaterial` or `MeshToonMaterial`.
- **Tweak Properties:** Always explicitly set `roughness` and `metalness` to give objects realistic surface properties.
- **Emissive Elements:** For LED lights or glowing parts, use the `emissive` property and animate `emissiveIntensity` rather than swapping out materials.

## 4. Interaction & UX

- **Hover States:** Interactive objects must provide hover feedback. Implement a `pointermove` raycaster that changes the cursor to `"pointer"`. 
- **Physical Feedback:** Use `Vector3.lerp` in the `animate` loop to smoothly scale up objects when hovered, and scale them down when unhovered.
- **Loading State:** Three.js scenes load asynchronously via CDN. Always include a fallback loading UI (e.g., HTML/React overlay) that hides once `threeLoaded` is true.
- **Controls:** Implement smooth camera controls (drag to orbit/rotate, scroll to zoom) and handle touch events for mobile compatibility.

## 5. Atmosphere

- Consider adding subtle atmospheric elements where appropriate, such as floating dust particles (`THREE.Points`) inside spotlight cones or subtle fog (`scene.fog = new THREE.Fog(...)`) to give depth to dark scenes.

## 6. Cleanup & Memory Management

Memory leaks in React + Three.js will crash the app. The `useEffect` cleanup function MUST:
- Call `cancelAnimationFrame(animationId)`
- Remove ALL event listeners (click, pointermove, mousedown, wheel, resize, etc.)
- Remove the canvas from the DOM (`container.removeChild(renderer.domElement)`)
- Call `renderer.dispose()`
