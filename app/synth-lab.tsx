import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const THREE_CDNS = [
  "https://unpkg.com/three@0.160.0/build/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
];

const ACCENT = 0xa855f7;
const FACEPLATE_DARK = 0x1a1a2e;
const KNOB_SILVER = 0xc0c0c0;
const JACK_GREEN = 0x22c55e;
const JACK_PINK = 0xec4899;
const GRID_SIZE = 16;
const FLOOR_COLOR = 0x0f172a;
const GRID_COLOR_MAIN = 0x1e293b;
const GRID_COLOR_MINOR = 0x0f172a;

// Eurorack module definitions: 6 cols x 3 rows = 18 modules
const MODULE_TYPES = [
  { name: "VCO", color: "#dc2626", hasKnobs: 3, hasJacks: 4 },
  { name: "VCF", color: "#2563eb", hasKnobs: 4, hasJacks: 3 },
  { name: "VCA", color: "#059669", hasKnobs: 2, hasJacks: 2 },
  { name: "LFO", color: "#a855f7", hasKnobs: 3, hasJacks: 3, lfo: true },
  { name: "ENV", color: "#b45309", hasKnobs: 4, hasJacks: 2 },
  { name: "MIX", color: "#0891b2", hasKnobs: 5, hasJacks: 4 },
  { name: "NOISE", color: "#6b7280", hasKnobs: 2, hasJacks: 2 },
  { name: "SEQ", color: "#7c3aed", hasKnobs: 3, hasJacks: 3 },
  { name: "S&H", color: "#ec4899", hasKnobs: 2, hasJacks: 3 },
  { name: "RING", color: "#f59e0b", hasKnobs: 3, hasJacks: 3 },
  { name: "WAVE", color: "#14b8a6", hasKnobs: 2, hasJacks: 2 },
  { name: "DELAY", color: "#6366f1", hasKnobs: 4, hasJacks: 3 },
  { name: "OSC", color: "#ef4444", hasKnobs: 3, hasJacks: 2 },
  { name: "FLT", color: "#3b82f6", hasKnobs: 5, hasJacks: 3 },
  { name: "AMP", color: "#10b981", hasKnobs: 2, hasJacks: 2 },
  { name: "RAND", color: "#8b5cf6", hasKnobs: 1, hasJacks: 2 },
  { name: "COMP", color: "#f97316", hasKnobs: 4, hasJacks: 3 },
  { name: "CLK", color: "#14b8a6", hasKnobs: 2, hasJacks: 4 },
];

function createEurorackModule(THREE: ThreeAny, modType: typeof MODULE_TYPES[0], x: number, y: number, z: number, time: number): ThreeAny {
  const group = new THREE.Group();

  // Faceplate
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.8, 0.15),
    new THREE.MeshStandardMaterial({
      color: FACEPLATE_DARK,
      roughness: 0.7,
      metalness: 0.3,
    })
  );
  group.add(plate);

  // Top label strip
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.25),
    new THREE.MeshStandardMaterial({ color: modType.color, roughness: 0.5 })
  );
  label.position.set(0, 0.75, 0.08);
  group.add(label);

  // Module name sprite
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(modType.name, 64, 22);
  const nameTex = new THREE.CanvasTexture(c);
  const nameSprite = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.2),
    new THREE.MeshBasicMaterial({ map: nameTex, transparent: true })
  );
  nameSprite.position.set(0, 0.75, 0.09);
  group.add(nameSprite);

  // Rotary knobs (silver)
  const knobPositions: [number, number][] = [];
  const knobRows = modType.hasKnobs <= 2 ? 1 : modType.hasKnobs <= 4 ? 2 : 2;
  const knobsPerRow = Math.ceil(modType.hasKnobs / knobRows);
  for (let row = 0; row < knobRows; row++) {
    for (let col = 0; col < knobsPerRow; col++) {
      if (knobPositions.length >= modType.hasKnobs) break;
      const kx = (col - (knobsPerRow - 1) / 2) * 0.35;
      const ky = 0.2 - row * 0.45;
      knobPositions.push([kx, ky]);
    }
  }

  for (const [kx, ky] of knobPositions) {
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: KNOB_SILVER, metalness: 0.8, roughness: 0.2 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(kx, ky, 0.1);
    group.add(knob);

    // Knob indicator line
    const indicator = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.06, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    indicator.position.set(kx + 0.04, ky, 0.12);
    group.add(indicator);
  }

  // Patch jacks
  const jackStartY = -0.5;
  const jackSpacing = 0.3;
  for (let j = 0; j < modType.hasJacks; j++) {
    const jackColor = j % 2 === 0 ? JACK_GREEN : JACK_PINK;
    const jack = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.09, 16),
      new THREE.MeshBasicMaterial({ color: jackColor, side: THREE.DoubleSide })
    );
    jack.position.set((j - (modType.hasJacks - 1) / 2) * jackSpacing, jackStartY, 0.1);
    group.add(jack);

    // Jack inner circle
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    inner.position.copy(jack.position);
    inner.position.z = 0.101;
    group.add(inner);
  }

  // LFO indicator lights
  if (modType.lfo) {
    for (let l = 0; l < 3; l++) {
      const light = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 16),
        new THREE.MeshBasicMaterial({
          color: l === 0 ? 0x22c55e : l === 1 ? 0xf59e0b : 0xef4444,
          transparent: true,
          opacity: 0.3 + Math.sin(time * 0.003 + l * 2) * 0.3,
        })
      );
      light.position.set(-0.4 + l * 0.4, -0.75, 0.1);
      light.userData.isLfoLight = true;
      light.userData.lfoPhase = l * 2;
      group.add(light);
    }
  }

  group.position.set(x, y, z);
  return group;
}

function createKeyboard(THREE: ThreeAny, x: number, y: number, z: number): ThreeAny {
  const group = new THREE.Group();

  // Keyboard base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.15, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6, metalness: 0.4 })
  );
  group.add(base);

  // White keys
  const whiteKeyWidth = 0.18;
  const numWhiteKeys = 14;
  for (let i = 0; i < numWhiteKeys; i++) {
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(whiteKeyWidth - 0.01, 0.08, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 })
    );
    key.position.set((i - (numWhiteKeys - 1) / 2) * whiteKeyWidth, 0.12, 0.1);
    group.add(key);
  }

  // Black keys
  const blackKeyWidth = 0.12;
  const blackKeyPattern = [1, 3, 6, 8, 10]; // positions relative to white keys
  for (const bp of blackKeyPattern) {
    if (bp < numWhiteKeys) {
      const key = new THREE.Mesh(
        new THREE.BoxGeometry(blackKeyWidth, 0.06, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })
      );
      key.position.set((bp - (numWhiteKeys - 1) / 2) * whiteKeyWidth, 0.16, -0.05);
      group.add(key);
    }
  }

  // Accent strip
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(5.1, 0.02, 0.05),
    new THREE.MeshBasicMaterial({ color: ACCENT })
  );
  strip.position.set(0, 0.08, 0.5);
  group.add(strip);

  group.position.set(x, y, z);
  return group;
}

export default function SynthLab() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: ACCENT, intensity: 4 });

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let cancelled = false;
    let animationId = 0;

    async function loadThree(): Promise<ThreeAny> {
      const existing = ((window as unknown) as Record<string, unknown>).THREE as ThreeAny;
      if (existing) return existing;

      for (const url of THREE_CDNS) {
        try {
          const three = await new Promise<ThreeAny>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = url;
            script.onload = () => resolve(((window as unknown) as Record<string, unknown>).THREE as ThreeAny);
            script.onerror = () => reject(new Error(`Failed to load Three.js from ${url}`));
            document.head.appendChild(script);
          });
          return three;
        } catch {
          continue;
        }
      }
      throw new Error("Failed to load Three.js from all CDN sources");
    }

    async function init() {
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      let THREE: ThreeAny;
      try {
        THREE = await loadThree();
      } catch {
        if (!cancelled) setLoadError("Three.js unavailable — 3D Synth Lab disabled");
        return;
      }
      if (cancelled) return;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a14);
      scene.fog = new THREE.Fog(0x0a0a14, 12, 25);

      // Perspective Camera
      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.set(0, 3, 8);
      camera.lookAt(0, 2, 0);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);

      // Lighting
      const ambient = new THREE.AmbientLight(0x505080, 1.2);
      scene.add(ambient);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
      mainLight.position.set(3, 8, 5);
      scene.add(mainLight);

      // Accent point lights (electric purple)
      const accentLight1 = new THREE.PointLight(ACCENT, 4.0, 20);
      accentLight1.position.set(-4, 5, 2);
      scene.add(accentLight1);

      const accentLight2 = new THREE.PointLight(ACCENT, 3.0, 18);
      accentLight2.position.set(4, 3, -2);
      scene.add(accentLight2);

      const fillLight = new THREE.PointLight(0x3b82f6, 1.0, 15);
      fillLight.position.set(0, 2, 6);
      scene.add(fillLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: ACCENT });

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
        new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.95, metalness: 0.05 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1;
      scene.add(floor);

      // Floor grid
      scene.add(new THREE.GridHelper(GRID_SIZE, GRID_SIZE, GRID_COLOR_MAIN, GRID_COLOR_MINOR));

      // Back wall
      const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, 10),
        new THREE.MeshStandardMaterial({ color: 0x0f0f1a, roughness: 0.98 })
      );
      backWall.position.set(0, 4, -GRID_SIZE / 2);
      scene.add(backWall);

      // Eurorack wall: 6 columns x 3 rows = 18 modules
      const moduleGroup = new THREE.Group();
      scene.add(moduleGroup);

      const colSpacing = 1.6;
      const rowSpacing = 2.0;
      const startCol = -((6 - 1) * colSpacing) / 2;
      const startRow = 0;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 6; col++) {
          const modIdx = row * 6 + col;
          const modType = MODULE_TYPES[modIdx];
          const mx = startCol + col * colSpacing;
          const my = startRow + row * rowSpacing + 1;
          const mz = -GRID_SIZE / 2 + 0.3;
          const module = createEurorackModule(THREE, modType, mx, my, mz, performance.now());
          moduleGroup.add(module);
        }
      }

      // Floating keyboard in center
      const keyboard = createKeyboard(THREE, 0, 0.5, 2);
      scene.add(keyboard);

      // LFO lights collection for animation
      const lfoLights: ThreeAny[] = [];
      moduleGroup.traverse((child: ThreeAny) => {
        if (child.userData && child.userData.isLfoLight) {
          lfoLights.push(child);
        }
      });

      // OrbitControls-like mouse drag rotation
      let isDragging = false;
      let previousMouseX = 0;
      let previousMouseY = 0;
      let cameraAngleX = 0;
      let cameraAngleY = 0.4;
      let cameraDistance = 10;
      const rotateSpeed = 0.005;
      const zoomSpeed = 0.02;
      const minDistance = 5;
      const maxDistance = 18;

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;
        cameraAngleX += deltaX * rotateSpeed;
        cameraAngleY = Math.max(-0.5, Math.min(1.2, cameraAngleY + deltaY * rotateSpeed));
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      const handleWheel = (e: WheelEvent) => {
        cameraDistance += e.deltaY * zoomSpeed;
        cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance));
      };

      renderer.domElement.addEventListener("mousedown", handleMouseDown);
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseup", handleMouseUp);
      renderer.domElement.addEventListener("mouseleave", handleMouseUp);
      renderer.domElement.addEventListener("wheel", handleWheel);

      // Animation loop
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Update camera position from orbit angles
        camera.position.x = Math.sin(cameraAngleX) * Math.cos(cameraAngleY) * cameraDistance;
        camera.position.y = Math.sin(cameraAngleY) * cameraDistance + 2;
        camera.position.z = Math.cos(cameraAngleX) * Math.cos(cameraAngleY) * cameraDistance;
        camera.lookAt(0, 2, 0);

        // Keyboard floating bob
        keyboard.position.y = 0.5 + Math.sin(time * 0.001) * 0.15;
        keyboard.rotation.y = Math.sin(time * 0.0005) * 0.05;

        // LFO lights pulse animation
        for (const light of lfoLights) {
          const phase = light.userData.lfoPhase || 0;
          const intensity = 0.3 + Math.sin(time * 0.003 + phase) * 0.3;
          light.material.opacity = intensity;
          light.material.color.setHSL(
            light.material.color.getHSL().h,
            1,
            0.3 + intensity * 0.4
          );
        }

        // Eurorack modules subtle glow pulse
        moduleGroup.children.forEach((mod: ThreeAny, idx: number) => {
          const pulse = 0.02 + Math.sin(time * 0.001 + idx * 0.5) * 0.02;
          mod.children.forEach((child: ThreeAny) => {
            if (child.material && child.material.emissive !== undefined) {
              child.material.emissive = new THREE.Color(ACCENT).multiplyScalar(pulse);
            }
          });
        });

        // Accent lights subtle pulse
        const lc = lightRef.current;
        accentLight1.color.setHex(lc.color);
        accentLight1.intensity = lc.intensity + Math.sin(time * 0.002) * (lc.intensity * 0.2);
        accentLight2.color.setHex(lc.color);
        accentLight2.intensity = lc.intensity * 0.7 + Math.sin(time * 0.002 + Math.PI) * (lc.intensity * 0.15);
        stripMat.color.setHex(lc.color);
        stripMat.emissive.setHex(lc.color);
        dotMat.color.setHex(lc.color);

        renderer.render(scene, camera);
      }

      animate(performance.now());
      setThreeLoaded(true);

      // Resize handler
      const handleResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        cancelled = true;
        cancelAnimationFrame(animationId);
        renderer.domElement.removeEventListener("mousedown", handleMouseDown);
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseup", handleMouseUp);
        renderer.domElement.removeEventListener("mouseleave", handleMouseUp);
        renderer.domElement.removeEventListener("wheel", handleWheel);
        window.removeEventListener("resize", handleResize);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, []);

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">SYNTH LAB</Text>
        </View>
        <View className="w-9" />
      </View>

      {/* 3D Canvas */}
      <View className="flex-1 relative bg-black">
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          style={{ position: "absolute", inset: 0 }}
        />

        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-4xl mb-3">🎹</Text>
            <Text className="text-white font-bold text-lg">Loading Synth Lab...</Text>
          </View>
        )}

        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🎹</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}

        {/* Controls hint */}
        {threeLoaded && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🖱 Drag to rotate • Scroll to zoom • 18 Eurorack modules</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={4} />
      </View>
    </View>
  );
}
