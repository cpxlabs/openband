type ThreeAny = any;

export function addSceneBulb(
  THREE: ThreeAny,
  scene: ThreeAny,
  options: {
    x?: number;
    y?: number;
    z?: number;
    intensity?: number;
    color?: number;
    bulbColor?: number;
    distance?: number;
  } = {},
) {
  const {
    x = 0,
    y = 4.8,
    z = 0,
    intensity = 6.0,
    color = 0xfff1c1,
    bulbColor = 0xfff5d6,
    distance = 30,
  } = options;

  const group = new THREE.Group();
  group.position.set(x, y, z);

  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.8 }),
  );
  wire.position.y = -0.2;
  group.add(wire);

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6, metalness: 0.2 }),
  );
  socket.position.y = -0.42;
  group.add(socket);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({
      color: bulbColor,
      emissive: color,
      emissiveIntensity: 3.5,
      roughness: 0.15,
      metalness: 0.05,
    }),
  );
  bulb.position.y = -0.62;
  group.add(bulb);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }),
  );
  halo.position.y = -0.62;
  group.add(halo);

  const light = new THREE.PointLight(color, intensity, distance);
  light.position.y = -0.62;
  group.add(light);

  scene.add(group);
  return group;
}

export function addRGBStrip(
  THREE: ThreeAny,
  scene: ThreeAny,
  options: {
    x?: number;
    y?: number;
    z?: number;
    length?: number;
    color?: number;
  } = {},
) {
  const { x = 0, y = 0.02, z = -5.5, length = 14, color = 0x00e5ff } = options;

  const stripMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  const strip = new THREE.Mesh(new THREE.BoxGeometry(length, 0.015, 0.04), stripMat);
  strip.position.set(x, y, z);
  scene.add(strip);

  const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
  const dotCount = Math.floor(length * 2.5);
  for (let i = 0; i < dotCount; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dotMat);
    dot.position.set(-length / 2 + i * (length / dotCount), y + 0.012, z + 0.025);
    scene.add(dot);
  }

  return { stripMat, dotMat };
}
