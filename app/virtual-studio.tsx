import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";
import { Screen3DFallback } from "../src/components";
import { loadThree } from "../src/lib/loadThree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

interface FurnitureDef {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  route: string;
}

const FURNITURE: FurnitureDef[] = [
  { id: "mixer", name: "Mixing Console", icon: "🎛", x: -3.5, y: 0, z: -2, w: 2.5, h: 0.6, d: 1.5, color: "#2563eb", route: "/mixing-console" },
  { id: "mastering", name: "Mastering Suite", icon: "🎚", x: 3.5, y: 0, z: -2, w: 1.5, h: 1.2, d: 1.2, color: "#7c3aed", route: "/mastering" },
  { id: "beatmaker", name: "Beatmaker", icon: "🥁", x: -3.5, y: 0, z: 2, w: 2.5, h: 0.5, d: 1.5, color: "#dc2626", route: "/beatmaker" },
  { id: "synth", name: "Synth Lab", icon: "🎹", x: 3.5, y: 0, z: 2, w: 2, h: 0.5, d: 1.2, color: "#a855f7", route: "/synth-lab" },
  { id: "dj", name: "DJ Stage", icon: "💿", x: -3.5, y: 0, z: 0, w: 2, h: 0.5, d: 1.5, color: "#10b981", route: "/dj-stage" },
  { id: "autotune", name: "Auto-Tune", icon: "🎤", x: 3.5, y: 0, z: 0, w: 2, h: 0.5, d: 1.2, color: "#00ffaa", route: "/autotune" },
  { id: "live", name: "Live Room", icon: "🎸", x: 0, y: 0, z: -3.5, w: 2, h: 0.3, d: 1, color: "#ef4444", route: "/live-room" },
  { id: "spatial", name: "Spatial Audio", icon: "🔊", x: 0, y: 0, z: 3.5, w: 2, h: 0.5, d: 1, color: "#6366f1", route: "/spatial-audio" },
  { id: "stems", name: "Stem Collider", icon: "🔮", x: -2, y: 0, z: -3.5, w: 1.5, h: 0.3, d: 1, color: "#38bdf8", route: "/stem-collider" },
  { id: "lofi", name: "Tape Lab", icon: "📼", x: 2, y: 0, z: -3.5, w: 1.5, h: 0.3, d: 1, color: "#ff5500", route: "/lofi-tape" },
  { id: "acoustics", name: "Acoustics", icon: "🔇", x: -2, y: 0, z: 3.5, w: 1.5, h: 0.3, d: 1, color: "#10b981", route: "/acoustics" },
  { id: "coverjam", name: "Cover Jam", icon: "🎬", x: 2, y: 0, z: 3.5, w: 1.5, h: 0.3, d: 1, color: "#00e5ff", route: "/cover-jam" },
];

const GRID_SIZE = 16;
const FLOOR_COLOR = 0x1e293b;
const GRID_COLOR_MAIN = 0x334155;
const GRID_COLOR_MINOR = 0x1e293b;
const WALL_COLOR = 0x1e293b;
const WALL_OPACITY = 0.5;
const CAMERA_DISTANCE = 8;
const MOVE_SPEED = 4;
const AVATAR_BOUNDS = 7;

function makeSprite(THREE: ThreeAny, text: string, fontSize: number, y: number, scaleX: number, scaleY: number): ThreeAny {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 48;
  const ctx = c.getContext("2d")!;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  sprite.position.y = y;
  sprite.scale.set(scaleX, scaleY, 1);
  return sprite;
}

export default function VirtualStudio() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<FurnitureDef | null>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: 0x3b82f6, intensity: 6 });

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let cancelled = false;
    let animationId = 0;

    async function init() {
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      let THREE: ThreeAny;
      try {
        THREE = await loadThree();
      } catch {
        if (!cancelled) setLoadError("Three.js unavailable — 3D room disabled");
        return;
      }
      if (cancelled) return;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);

      // Orthographic Camera (isometric)
      const aspect = width / height;
      const camera = new THREE.OrthographicCamera(
        -CAMERA_DISTANCE * aspect,
        CAMERA_DISTANCE * aspect,
        CAMERA_DISTANCE,
        -CAMERA_DISTANCE,
        0.1,
        100
      );
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x606080, 1.5));

      const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
      mainLight.position.set(5, 10, 5);
      scene.add(mainLight);

      const fillLight = new THREE.PointLight(0x3b82f6, 1.0, 20);
      fillLight.position.set(-5, 5, -5);
      scene.add(fillLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: 0x3b82f6 });

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
        new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9, metalness: 0.1 })
      );
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      // Grid
      scene.add(new THREE.GridHelper(GRID_SIZE, GRID_SIZE, GRID_COLOR_MAIN, GRID_COLOR_MINOR));

      // Walls (back + left, semi-transparent)
      const wallMat = new THREE.MeshStandardMaterial({
        color: WALL_COLOR,
        roughness: 0.95,
        transparent: true,
        opacity: WALL_OPACITY,
      });

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(GRID_SIZE, 6), wallMat);
      backWall.position.set(0, 3, -GRID_SIZE / 2);
      scene.add(backWall);

      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(GRID_SIZE, 6), wallMat);
      leftWall.position.set(-GRID_SIZE / 2, 3, 0);
      leftWall.rotation.y = Math.PI / 2;
      scene.add(leftWall);

      // Furniture
      const furnitureMeshes: ThreeAny[] = [];
      const furnitureBaseColors: ThreeAny[] = [];
      const furnitureGroup = new THREE.Group();
      scene.add(furnitureGroup);

      for (const f of FURNITURE) {
        const baseColor = new THREE.Color(f.color);
        furnitureBaseColors.push(baseColor);

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(f.w, f.h, f.d),
          new THREE.MeshToonMaterial({ color: baseColor })
        );
        mesh.position.set(f.x, f.y + f.h / 2, f.z);
        mesh.userData = { furnitureId: f.id, route: f.route };
        furnitureGroup.add(mesh);
        furnitureMeshes.push(mesh);

        // Top highlight
        const topMesh = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 0.1, 0.05, f.d - 0.1),
          new THREE.MeshToonMaterial({ color: baseColor.clone().multiplyScalar(1.3) })
        );
        topMesh.position.set(f.x, f.y + f.h + 0.025, f.z);
        furnitureGroup.add(topMesh);

        // Sprite label (icon + name)
        const label = makeSprite(THREE, `${f.icon} ${f.name}`, 28, f.y + f.h + 1.2, 3, 0.75);
        label.position.x = f.x;
        label.position.z = f.z;
        furnitureGroup.add(label);
      }

      // Local avatar (capsule body + sphere head)
      const avatarGroup = new THREE.Group();
      scene.add(avatarGroup);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.6, 4, 8), new THREE.MeshToonMaterial({ color: 0xff3b30 }));
      body.position.y = 0.55;
      avatarGroup.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshToonMaterial({ color: 0xfde68a }));
      head.position.y = 1.1;
      avatarGroup.add(head);

      // Avatar name sprite
      const nameSprite = makeSprite(THREE, "You", 24, 1.6, 2, 0.4);
      avatarGroup.add(nameSprite);

      // Raycaster for click detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(furnitureMeshes, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object as { userData: { furnitureId: string } };
          const found = FURNITURE.find(f => f.id === hit.userData.furnitureId);
          setSelectedFurniture(found ?? null);
        } else {
          setSelectedFurniture(null);
        }
      };
      renderer.domElement.addEventListener("click", handleClick);

      // WASD movement
      const keys = new Set<string>();
      const handleKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
      const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      // Animation loop
      let lastTime = performance.now();

      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        let dx = 0;
        let dz = 0;
        if (keys.has("w") || keys.has("arrowup")) dz -= 1;
        if (keys.has("s") || keys.has("arrowdown")) dz += 1;
        if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
        if (keys.has("d") || keys.has("arrowright")) dx += 1;

        if (dx !== 0 || dz !== 0) {
          const len = Math.sqrt(dx * dx + dz * dz);
          avatarGroup.position.x = Math.max(
            -AVATAR_BOUNDS,
            Math.min(AVATAR_BOUNDS, avatarGroup.position.x + (dx / len) * MOVE_SPEED * delta)
          );
          avatarGroup.position.z = Math.max(
            -AVATAR_BOUNDS,
            Math.min(AVATAR_BOUNDS, avatarGroup.position.z + (dz / len) * MOVE_SPEED * delta)
          );
        }

        // Avatar bob
        const bob = Math.sin(time * 0.003) * 0.03;
        body.position.y = 0.55 + bob;
        head.position.y = 1.1 + bob;

        // Furniture glow pulse (own color, subtle)
        for (let i = 0; i < furnitureMeshes.length; i++) {
          const pulse = 0.05 + Math.sin(time * 0.002 + i * 1.2) * 0.04;
          furnitureMeshes[i].material.emissive = furnitureBaseColors[i].clone().multiplyScalar(pulse);
        }

        const lc = lightRef.current;
        fillLight.color.setHex(lc.color);
        fillLight.intensity = lc.intensity * 0.3;
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
        const a = w / h;
        camera.left = -CAMERA_DISTANCE * a;
        camera.right = CAMERA_DISTANCE * a;
        camera.top = CAMERA_DISTANCE;
        camera.bottom = -CAMERA_DISTANCE;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        cancelled = true;
        cancelAnimationFrame(animationId);
        renderer.domElement.removeEventListener("click", handleClick);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
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

  if (Platform.OS !== "web") {
    return <Screen3DFallback title="3D Studio" icon="🏠" />;
  }

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">3D Studio</Text>
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
            <Text className="text-4xl mb-3">🏠</Text>
            <Text className="text-white font-bold text-lg">Loading Virtual Studio...</Text>
          </View>
        )}

        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🏠</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}

        {/* Selected furniture overlay */}
        {selectedFurniture && threeLoaded && (
          <View className="absolute top-4 left-4 bg-dark-surface/90 backdrop-blur-sm rounded-xl p-4 border border-dark-border">
            <Text className="text-3xl mb-1">{selectedFurniture.icon}</Text>
            <Text className="text-white font-bold text-base">{selectedFurniture.name}</Text>
            <View className="flex-row gap-2 mt-3">
              <Pressable
                onPress={() => router.push(selectedFurniture.route)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${selectedFurniture.name}`}
                className="bg-brand-primary rounded-lg px-4 py-2"
              >
                <Text className="text-white font-bold text-sm">Open</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedFurniture(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                className="bg-dark-muted rounded-lg px-4 py-2"
              >
                <Text className="text-gray-300 font-bold text-sm">Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Controls hint */}
        {threeLoaded && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🎮 WASD to move • Click furniture to open</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={0x3b82f6} defaultIntensity={6} />
      </View>
    </View>
  );
}
