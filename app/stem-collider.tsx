import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const THREE_CDNS = [
  "https://unpkg.com/three@0.160.0/build/three.module.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
];

const ACCENT = 0x38bdf8;
const CAM_POS = [0, 5, 8] as [number, number, number];
const TARGET = [0, 2, -2] as [number, number, number];

const STEM_COLORS: Record<string, number> = {
  vocals: 0xec4899,
  drums: 0x3b82f6,
  bass: 0x10b981,
  other: 0xf59e0b,
};

const STEM_POSITIONS: [number, number, number][] = [
  [-1.5, 3.5, -1.5],
  [1.5, 3.8, -1.5],
  [-1.5, 3.2, 0.5],
  [1.5, 3.6, 0.5],
];

const STEM_NAMES = ["vocals", "drums", "bass", "other"];

export default function StemCollider() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: ACCENT, intensity: 6 });

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let cancelled = false;
    let animationId = 0;

    async function loadThree(): Promise<ThreeAny> {
      for (const url of THREE_CDNS) {
        try {
          const mod = await new Function('url', 'return import(url)')(url);
          return mod;
        } catch { continue; }
      }
      throw new Error("Three.js unavailable");
    }

    async function init() {
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      let THREE: ThreeAny;
      try { THREE = await loadThree(); } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
        return;
      }
      if (cancelled) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.Fog(0x0a0a0f, 14, 28);

      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.set(...CAM_POS);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x505070, 1.2));
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(5, 8, 5);
      scene.add(dirLight);
      const accentLight = new THREE.PointLight(ACCENT, 6, 20);
      accentLight.position.set(0, 4, -2);
      scene.add(accentLight);
      const fillLight = new THREE.PointLight(0x3b82f6, 1.5, 15);
      fillLight.position.set(-4, 3, -1);
      scene.add(fillLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: ACCENT });

      // Floor
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Grid
      scene.add(new THREE.GridHelper(16, 16, ACCENT, 0x222233));

      // Back wall
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9 });
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
      backWall.position.set(0, 4, -6);
      scene.add(backWall);

      // Containment ring pedestal
      const pedestalBase = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3.3, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.5, metalness: 0.7 })
      );
      pedestalBase.position.set(0, 0.25, -2);
      pedestalBase.castShadow = true;
      pedestalBase.receiveShadow = true;
      scene.add(pedestalBase);

      // Glowing ring on top of pedestal
      const ringGeo = new THREE.TorusGeometry(2.8, 0.06, 8, 64);
      const ringMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.5, -2);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);

      // Inner ring detail lines
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.3),
          new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.8 })
        );
        marker.position.set(
          Math.cos(angle) * 2.8,
          0.5,
          -2 + Math.sin(angle) * 2.8
        );
        marker.rotation.y = -angle;
        scene.add(marker);
      }

      // Center laser projection base
      const laserBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.3, metalness: 0.9 })
      );
      laserBase.position.set(0, 0.65, -2);
      laserBase.castShadow = true;
      scene.add(laserBase);

      const laserLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 2, transparent: true, opacity: 0.8 })
      );
      laserLens.position.set(0, 0.82, -2);
      scene.add(laserLens);

      // Vertical laser beam
      const laserBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 3, 8),
        new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 3, transparent: true, opacity: 0.5 })
      );
      laserBeam.position.set(0, 2.3, -2);
      scene.add(laserBeam);

      // Stem orbs
      const orbGroups: ThreeAny[] = [];
      const orbMeshes: ThreeAny[] = [];
      const mutedState: boolean[] = [false, false, false, false];

      for (let i = 0; i < 4; i++) {
        const color = STEM_COLORS[STEM_NAMES[i]];
        const group = new THREE.Group();

        const outerGeo = new THREE.SphereGeometry(0.5, 24, 24);
        const outerMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.7,
        });
        const outerSphere = new THREE.Mesh(outerGeo, outerMat);
        group.add(outerSphere);

        const innerGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 });
        const innerSphere = new THREE.Mesh(innerGeo, innerMat);
        group.add(innerSphere);

        const [ox, oy, oz] = STEM_POSITIONS[i];
        group.position.set(ox, oy, oz);
        group.userData = { stemIndex: i, stemName: STEM_NAMES[i] };

        scene.add(group);
        orbGroups.push(group);
        orbMeshes.push(outerSphere, innerSphere);
      }

      // Orbit controls (manual)
      let sphericalTheta = 0.3;
      let sphericalPhi = Math.PI / 4;
      let sphericalRadius = 9;
      let isDragging = false;
      let lastMX = 0;
      let lastMY = 0;

      const updateCamera = () => {
        const x = sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
        const y = sphericalRadius * Math.cos(sphericalPhi);
        const z = sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
        camera.position.set(TARGET[0] + x, TARGET[1] + y, TARGET[2] + z);
        camera.lookAt(TARGET[0], TARGET[1], TARGET[2]);
      };
      updateCamera();

      renderer.domElement.addEventListener("mousedown", (e: MouseEvent) => { isDragging = true; lastMX = e.clientX; lastMY = e.clientY; });
      window.addEventListener("mousemove", (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMX;
        const dy = e.clientY - lastMY;
        sphericalTheta -= dx * 0.005;
        sphericalPhi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, sphericalPhi - dy * 0.005));
        lastMX = e.clientX;
        lastMY = e.clientY;
        updateCamera();
      });
      window.addEventListener("mouseup", () => { isDragging = false; });
      renderer.domElement.addEventListener("wheel", (e: WheelEvent) => {
        sphericalRadius = Math.max(4, Math.min(15, sphericalRadius + e.deltaY * 0.01));
        updateCamera();
      });

      // Touch support
      let lastTouchDist = 0;
      renderer.domElement.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length === 1) { isDragging = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; }
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
      });
      renderer.domElement.addEventListener("touchmove", (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          const dx = e.touches[0].clientX - lastMX;
          const dy = e.touches[0].clientY - lastMY;
          sphericalTheta -= dx * 0.005;
          sphericalPhi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, sphericalPhi - dy * 0.005));
          lastMX = e.touches[0].clientX;
          lastMY = e.touches[0].clientY;
          updateCamera();
        }
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          sphericalRadius = Math.max(4, Math.min(15, sphericalRadius - (dist - lastTouchDist) * 0.02));
          lastTouchDist = dist;
          updateCamera();
        }
      }, { passive: false });
      renderer.domElement.addEventListener("touchend", () => { isDragging = false; });

      // Raycaster for orb clicking
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const toggleMute = (idx: number) => {
        mutedState[idx] = !mutedState[idx];
        const group = orbGroups[idx];
        const outerSphere = group.children[0] as ThreeAny;
        const innerSphere = group.children[1] as ThreeAny;

        if (mutedState[idx]) {
          outerSphere.material.wireframe = true;
          outerSphere.material.opacity = 0.3;
          outerSphere.material.emissiveIntensity = 0.2;
          innerSphere.material.opacity = 0.2;
          innerSphere.material.transparent = true;
        } else {
          outerSphere.material.wireframe = false;
          outerSphere.material.opacity = 0.7;
          outerSphere.material.emissiveIntensity = 0.8;
          innerSphere.material.opacity = 1.0;
        }
      };

      renderer.domElement.addEventListener("click", (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(orbMeshes, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          let group = hit.parent;
          if (group && group.userData.stemIndex !== undefined) {
            toggleMute(group.userData.stemIndex);
          }
        }
      });

      // Animation loop
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Float orbs up/down
        for (let i = 0; i < 4; i++) {
          const group = orbGroups[i];
          const [, oy] = STEM_POSITIONS[i];
          const baseY = oy + Math.sin(time * 0.001 + i * 1.5) * 0.3;
          group.position.y = baseY;

          // Pulse emissive intensity
          const outerSphere = group.children[0] as ThreeAny;
          if (!mutedState[i]) {
            outerSphere.material.emissiveIntensity = 0.6 + Math.sin(time * 0.003 + i) * 0.3;
          }
        }

        // Pulse ring
        ring.material.emissiveIntensity = 1.2 + Math.sin(time * 0.002) * 0.5;

        // Pulse laser
        laserBeam.material.opacity = 0.3 + Math.sin(time * 0.004) * 0.2;
        laserLens.material.emissiveIntensity = 1.5 + Math.sin(time * 0.003) * 0.5;

        // Pulsing accent light
        const lc = lightRef.current;
        accentLight.color.setHex(lc.color);
        accentLight.intensity = lc.intensity + Math.sin(time * 0.003) * (lc.intensity * 0.15);
        stripMat.color.setHex(lc.color);
        stripMat.emissive.setHex(lc.color);
        dotMat.color.setHex(lc.color);

        renderer.render(scene, camera);
      }
      animate(performance.now());
      setThreeLoaded(true);

      // Resize
      const handleResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        cancelled = true;
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", handleResize);
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, []);

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70">
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">STEM COLLIDER</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">⚛️</Text>
            <Text className="text-white font-bold text-lg">Loading Stem Collider...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">⚛️</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}
        {threeLoaded && !loadError && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🎮 Drag to orbit • Scroll to zoom • Click orbs to mute</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={6} />
      </View>
    </View>
  );
}
