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

const ROOM_WIDTH = 8;
const ROOM_DEPTH = 8;
const ROOM_HEIGHT = 5;
const SPOTLIGHT_COLOR = 0xf59e0b;
const FOAM_COLOR = 0x7c3aed;
const FOAM_DARK_COLOR = 0x5b21b6;
const FLOOR_COLOR = 0x1a1a2e;
const GRID_COLOR = 0x2d2d44;
const CHROME_COLOR = 0xc0c0c0;
const POP_FILTER_COLOR = 0xf59e0b;

export default function VocalBooth() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: SPOTLIGHT_COLOR, intensity: 8 });

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
        if (!cancelled) setLoadError("Three.js unavailable — 3D booth disabled");
        return;
      }
      if (cancelled) return;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a14);
      scene.fog = new THREE.Fog(0x0a0a14, 10, 25);

      // Perspective Camera
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      camera.position.set(3, 3, 6);
      camera.lookAt(0, 1.5, 0);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      container.appendChild(renderer.domElement);

      // ── Lighting ─────────────────────────────────────────────
      const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
      scene.add(ambientLight);

      // Warm amber spotlight from above (key light)
      const spotlight = new THREE.SpotLight(SPOTLIGHT_COLOR, 8, 20, Math.PI / 6, 0.5, 1);
      spotlight.position.set(0, ROOM_HEIGHT - 0.3, 0);
      spotlight.target.position.set(0, 1.2, 0);
      spotlight.castShadow = true;
      spotlight.shadow.mapSize.set(1024, 1024);
      spotlight.shadow.camera.near = 1;
      spotlight.shadow.camera.far = 15;
      scene.add(spotlight);
      scene.add(spotlight.target);

      // Subtle fill light from behind
      const fillLight = new THREE.PointLight(0x3b82f6, 1.0, 15);
      fillLight.position.set(0, 3, -3);
      scene.add(fillLight);

      // Rim light for mic silhouette
      const rimLight = new THREE.PointLight(SPOTLIGHT_COLOR, 1.5, 12);
      rimLight.position.set(-2, 4, 1);
      scene.add(rimLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: SPOTLIGHT_COLOR });

      // ── Floor ────────────────────────────────────────────────
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
        new THREE.MeshStandardMaterial({
          color: FLOOR_COLOR,
          roughness: 0.85,
          metalness: 0.15,
        })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Floor grid
      scene.add(new THREE.GridHelper(ROOM_WIDTH, 16, GRID_COLOR, GRID_COLOR));

      // ── Acoustic foam wall panels (back wall, zigzag pattern) ──
      const PANEL_COUNT = 9;
      const PANEL_WIDTH = ROOM_WIDTH / PANEL_COUNT;
      const PANEL_HEIGHT = ROOM_HEIGHT - 0.5;
      const DEPTH_ZIG = [0.3, 0.6]; // alternating depths

      const foamGroup = new THREE.Group();
      scene.add(foamGroup);

      for (let i = 0; i < PANEL_COUNT; i++) {
        const depth = DEPTH_ZIG[i % 2];
        const depthVal = depth === DEPTH_ZIG[0] ? 0.3 : 0.55;
        const x = -ROOM_WIDTH / 2 + PANEL_WIDTH / 2 + i * PANEL_WIDTH;

        // Curved panel using cylinder segment
        const curveGeo = new THREE.CylinderGeometry(
          ROOM_WIDTH / (Math.PI * 0.8),
          ROOM_WIDTH / (Math.PI * 0.8),
          PANEL_HEIGHT,
          16,
          1,
          false,
          0,
          Math.PI / (PANEL_COUNT * 1.2)
        );

        const panelMat = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? FOAM_COLOR : FOAM_DARK_COLOR,
          roughness: 0.95,
          metalness: 0.05,
        });

        const panel = new THREE.Mesh(curveGeo, panelMat);
        panel.position.set(x, PANEL_HEIGHT / 2 + 0.25, -ROOM_DEPTH / 2 + depthVal);
        panel.scale.set(PANEL_WIDTH * 0.85, 1, depth * 0.5);
        foamGroup.add(panel);

        // Egg-crate texture bumps on panel surface
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 2; col++) {
            const bump = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 0.12, depth * 0.3),
              new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? FOAM_DARK_COLOR : FOAM_COLOR,
                roughness: 1,
              })
            );
            bump.position.set(
              x - 0.1 + col * 0.2,
              0.6 + row * 0.9,
              -ROOM_DEPTH / 2 + depthVal + depth * 0.25
            );
            foamGroup.add(bump);
          }
        }
      }

      // ── Side walls (dark, minimal) ───────────────────────────
      const sideWallMat = new THREE.MeshStandardMaterial({
        color: 0x15152a,
        roughness: 0.9,
        transparent: true,
        opacity: 0.4,
      });

      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT), sideWallMat);
      leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      leftWall.rotation.y = Math.PI / 2;
      scene.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT), sideWallMat);
      rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      rightWall.rotation.y = -Math.PI / 2;
      scene.add(rightWall);

      // ── Microphone Stand ─────────────────────────────────────
      const micGroup = new THREE.Group();
      scene.add(micGroup);

      // Heavy round base
      const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.08, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.6, metalness: 0.4 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, 0.04, 0);
      base.castShadow = true;
      micGroup.add(base);

      // Vertical pole
      const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.6, 16);
      const poleMat = new THREE.MeshStandardMaterial({ color: CHROME_COLOR, roughness: 0.3, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, 0.88, 0);
      pole.castShadow = true;
      micGroup.add(pole);

      // Boom arm (angled)
      const boomGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 12);
      const boom = new THREE.Mesh(boomGeo, poleMat);
      boom.position.set(0, 1.68, 0.15);
      boom.rotation.z = Math.PI / 6;
      boom.castShadow = true;
      micGroup.add(boom);

      // Shock mount ring
      const shockMountGeo = new THREE.TorusGeometry(0.1, 0.015, 8, 24);
      const shockMountMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.3 });
      const shockMount = new THREE.Mesh(shockMountGeo, shockMountMat);
      shockMount.position.set(-0.18, 2.0, 0.3);
      shockMount.rotation.y = Math.PI / 4;
      micGroup.add(shockMount);

      // Chrome mic body (condenser cylinder)
      const micBodyGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16);
      const micBodyMat = new THREE.MeshStandardMaterial({
        color: CHROME_COLOR,
        roughness: 0.2,
        metalness: 0.9,
      });
      const micBody = new THREE.Mesh(micBodyGeo, micBodyMat);
      micBody.position.set(-0.2, 2.0, 0.32);
      micBody.rotation.z = Math.PI / 6;
      micBody.castShadow = true;
      micGroup.add(micBody);

      // Mic head grille (sphere)
      const micHeadGeo = new THREE.SphereGeometry(0.065, 16, 16);
      const micHeadMat = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.4,
        metalness: 0.7,
        wireframe: true,
      });
      const micHead = new THREE.Mesh(micHeadGeo, micHeadMat);
      micHead.position.set(-0.22, 2.14, 0.34);
      micGroup.add(micHead);

      // Pop filter wireframe torus
      const popFilterGeo = new THREE.TorusGeometry(0.14, 0.012, 8, 32);
      const popFilterMat = new THREE.MeshStandardMaterial({
        color: POP_FILTER_COLOR,
        roughness: 0.5,
        metalness: 0.6,
        emissive: SPOTLIGHT_COLOR,
        emissiveIntensity: 0.15,
      });
      const popFilter = new THREE.Mesh(popFilterGeo, popFilterMat);
      popFilter.position.set(-0.22, 1.85, 0.55);
      popFilter.rotation.x = Math.PI / 6;
      micGroup.add(popFilter);

      // Pop filter mesh (inner wireframe)
      const popMeshGeo = new THREE.CircleGeometry(0.13, 32);
      const popMeshMat = new THREE.MeshBasicMaterial({
        color: POP_FILTER_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const popMesh = new THREE.Mesh(popMeshGeo, popMeshMat);
      popMesh.position.copy(popFilter.position);
      popMesh.rotation.copy(popFilter.rotation);
      micGroup.add(popMesh);

      // Pop filter stand (small vertical support)
      const popStandGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
      const popStand = new THREE.Mesh(popStandGeo, poleMat);
      popStand.position.set(0.05, 1.65, 0.45);
      micGroup.add(popStand);

      // ── Ceiling acoustic tile ────────────────────────────────
      const ceilingTile = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 2),
        new THREE.MeshStandardMaterial({ color: 0x1e1e36, roughness: 1 })
      );
      ceilingTile.position.set(0, ROOM_HEIGHT - 0.05, 0);
      scene.add(ceilingTile);

      // ── Spotlight housing (ceiling fixture) ──────────────────
      const housingGeo = new THREE.CylinderGeometry(0.25, 0.15, 0.15, 24);
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.5 });
      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(0, ROOM_HEIGHT - 0.12, 0);
      scene.add(housing);

      // ── OrbitControls-like mouse drag rotation ──────────────
      let isDragging = false;
      let previousMouse = { x: 0, y: 0 };
      let spherical = { theta: 0.55, phi: 1.1, radius: 8 };
      let target = new THREE.Vector3(0, 1.5, 0);

      function updateCamera() {
        const sinPhi = Math.sin(spherical.phi);
        const cosPhi = Math.cos(spherical.phi);
        const sinTheta = Math.sin(spherical.theta);
        const cosTheta = Math.cos(spherical.theta);

        camera.position.set(
          target.x + spherical.radius * sinPhi * sinTheta,
          target.y + spherical.radius * cosPhi,
          target.z + spherical.radius * sinPhi * cosTheta
        );
        camera.lookAt(target);
      }

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        previousMouse = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - previousMouse.x;
        const dy = e.clientY - previousMouse.y;
        previousMouse = { x: e.clientX, y: e.clientY };

        spherical.theta -= dx * 0.005;
        spherical.phi = Math.max(0.3, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.005));
        spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, spherical.phi));

        updateCamera();
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      const handleWheel = (e: WheelEvent) => {
        spherical.radius = Math.max(3, Math.min(15, spherical.radius + e.deltaY * 0.01));
        updateCamera();
      };

      renderer.domElement.addEventListener("mousedown", handleMouseDown);
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseup", handleMouseUp);
      renderer.domElement.addEventListener("mouseleave", handleMouseUp);
      renderer.domElement.addEventListener("wheel", handleWheel);

      // Touch support
      let lastTouchDist = 0;
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true;
          previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
          const dx = e.touches[0].clientX - previousMouse.x;
          const dy = e.touches[0].clientY - previousMouse.y;
          previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

          spherical.theta -= dx * 0.005;
          spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, spherical.phi + dy * 0.005));
          updateCamera();
        }
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          spherical.radius = Math.max(3, Math.min(15, spherical.radius - (dist - lastTouchDist) * 0.02));
          lastTouchDist = dist;
          updateCamera();
        }
      };

      const handleTouchEnd = () => {
        isDragging = false;
      };

      renderer.domElement.addEventListener("touchstart", handleTouchStart, { passive: true });
      renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: true });
      renderer.domElement.addEventListener("touchend", handleTouchEnd);

      // ── Animation loop ───────────────────────────────────────
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Subtle spotlight flicker
        const lc = lightRef.current;
        spotlight.color.setHex(lc.color);
        spotlight.intensity = lc.intensity + Math.sin(time * 0.001) * (lc.intensity * 0.06);
        rimLight.color.setHex(lc.color);
        rimLight.intensity = lc.intensity * 0.18;

        // Pop filter subtle sway
        popFilter.rotation.z = Math.sin(time * 0.0008) * 0.03;
        popMesh.rotation.z = popFilter.rotation.z;

        // Strip sync
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
        renderer.domElement.removeEventListener("touchstart", handleTouchStart);
        renderer.domElement.removeEventListener("touchmove", handleTouchMove);
        renderer.domElement.removeEventListener("touchend", handleTouchEnd);
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
          <Text className="text-white font-bold text-base">VOCAL BOOTH</Text>
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
            <Text className="text-4xl mb-3">🎙️</Text>
            <Text className="text-white font-bold text-lg">Loading Vocal Booth...</Text>
          </View>
        )}

        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🎙️</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}

        {/* Controls hint */}
        {threeLoaded && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🖱️ Drag to rotate • Scroll to zoom</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={SPOTLIGHT_COLOR} defaultIntensity={8} />
      </View>
    </View>
  );
}
