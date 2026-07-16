# Design: Mixer Console 4-VU-Meter Groups

## Constants
Add near the top of `app/mixing-console.tsx` (after the color constants):
```ts
const VU_GROUP_DEFS = [
  { label: "DRUMS", color: 0xff6482 },
  { label: "BASS", color: 0x5ac8fa },
  { label: "KEYS", color: 0xffcc00 },
  { label: "VOICE", color: 0x00e5ff },
];
```
(drums/instruments/vocals mirror `createDefaultBuses` colors; 4th reuses the app
accent `0x00e5ff`.)

## `createVUMeterGroup` (new, near `createVUMeter`)
```ts
function createVUMeterGroup(
  THREE: ThreeAny,
  x: number,
  y: number,
  z: number,
  label: string,
  color: number,
): ThreeAny {
  const group = new THREE.Group();

  const meter = createVUMeter(THREE, x, y, z);
  group.add(meter);

  // Colored base bar showing the bus color
  const baseBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.04, 0.08),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }),
  );
  baseBar.position.set(x, y + 0.02, z);
  group.add(baseBar);

  // Label sprite
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 128;
  labelCanvas.height = 32;
  const lctx = labelCanvas.getContext("2d")!;
  lctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  lctx.font = "bold 20px sans-serif";
  lctx.textAlign = "center";
  lctx.fillText(label, 64, 24);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false }),
  );
  labelSprite.position.set(x, y + 1.05, z + 0.05);
  labelSprite.scale.set(0.6, 0.15, 1);
  group.add(labelSprite);

  return group;
}
```

## Render loop (replace lines 454-458)
```ts
const vuY = 1.6;
const vuZ = -1.4;
const vuStartX = -((VU_GROUP_DEFS.length - 1) * 0.9) / 2;
VU_GROUP_DEFS.forEach((def, v) => {
  const vx = vuStartX + v * 0.9;
  const vu = createVUMeterGroup(THREE, vx, vuY, vuZ, def.label, def.color);
  deskGroup.add(vu);
});
```

## Test Requirements (add to `openspec/specs/mixer-console/spec.md`)
- [x] Console renders 4 VU meter groups (distinct `THREE.Group`s) above the desk.
- [x] Each VU group has a label and a color consistent with the default bus palette.

## Tests
This is a 3D/WebGL component that cannot be unit-tested in jsdom (Three.js loads
from CDN at runtime). Per the spec's Test Requirements, verification is via
`tsc` (type-correct `Group`/`Sprite` usage) + the production `npm run build`
(Expo web export succeeds). No new vitest file is added (consistent with the
existing 3D console having no unit tests).
