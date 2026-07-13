import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";
import { Screen3DFallback } from "../src/components";
import { loadThree } from "../src/lib/loadThree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const ACCENT = 0x6366f1;
const CAM_POS = [0, 5, 8] as [number, number, number];
const TARGET = [0, 2, -2] as [number, number, number];

function createSpeaker(THREE: ThreeAny, x: number, y: number, z: number, angleY: number, angleX: number) {
  const group = new THREE.Group();

  // Pole
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.7, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, y, 8), poleMat);
  pole.position.set(x, y / 2, z);
  group.add(pole);

  // Monitor box
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.3, metalness: 0.6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), boxMat);
  box.position.set(x, y, z);
  box.rotation.y = angleY;
  box.rotation.x = angleX;
  box.castShadow = true;
  group.add(box);

  // Emissive cone (speaker driver)
  const coneMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5 });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.08, 16), coneMat);
  cone.position.set(x, y, z + 0.21);
  cone.rotation.y = angleY;
  cone.rotation.x = angleX;
  group.add(cone);

  return { group, coneMat };
}

export default function SpatialAudio() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: ACCENT, intensity: 6 });

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let cancelled = false;
    let animationId = 0;

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
      scene.fog = new THREE.Fog(0x0a0a0f, 12, 25);

      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.set(...CAM_POS);

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x505070, 1.0);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
      dirLight.position.set(5, 8, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const indigoPointLight = new THREE.PointLight(ACCENT, 6, 20);
      indigoPointLight.position.set(0, 4, -2);
      scene.add(indigoPointLight);

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
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9, transparent: true, opacity: 0.3 });
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
      backWall.position.set(0, 3, -6);
      scene.add(backWall);

      // Side walls
      const sideWallMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9, transparent: true, opacity: 0.2 });
      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), sideWallMat);
      leftWall.position.set(-6, 3, 0);
      leftWall.rotation.y = Math.PI / 2;
      scene.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), sideWallMat);
      rightWall.position.set(6, 3, 0);
      rightWall.rotation.y = -Math.PI / 2;
      scene.add(rightWall);

      // Central sweet spot pedestal
      const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.4, metalness: 0.6 });
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.5, 32), pedestalMat);
      pedestal.position.set(0, 0.25, -2);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      scene.add(pedestal);

      // Pedestal accent ring
      const ringMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.02, 8, 64), ringMat);
      ring.position.set(0, 0.5, -2);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);

      // Floating 3D sound hologram node
      const hologramMat = new THREE.MeshStandardMaterial({
        color: ACCENT,
        emissive: ACCENT,
        emissiveIntensity: 0.8,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      });
      const hologram = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), hologramMat);
      hologram.position.set(0, 2.5, -2);
      hologram.castShadow = true;
      scene.add(hologram);

      // Inner hologram core
      const coreMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.0, transparent: true, opacity: 0.4 });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), coreMat);
      core.position.set(0, 2.5, -2);
      scene.add(core);

      // Ear-level surround speaker ring: 6 speakers in a circle
      const speakerRadius = 3;
      const speakerHeight = 1.6;
      const earConeMats: ThreeAny[] = [];

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const sx = Math.cos(angle) * speakerRadius;
        const sz = Math.sin(angle) * speakerRadius - 2;
        const faceAngle = angle + Math.PI;

        const { group, coneMat } = createSpeaker(THREE, sx, speakerHeight, sz, faceAngle, 0);
        scene.add(group);
        earConeMats.push(coneMat);
      }

      // Height/ceiling speakers: 4 speakers mounted on ceiling angled downward
      const ceilingHeight = 5;
      const ceilingSpeakerPositions = [
        { x: -2.5, z: -3.5 },
        { x: 2.5, z: -3.5 },
        { x: -2.5, z: -0.5 },
        { x: 2.5, z: -0.5 },
      ];
      const heightConeMats: ThreeAny[] = [];

      for (const pos of ceilingSpeakerPositions) {
        const group = new THREE.Group();

        // Ceiling mount bracket
        const bracketMat = new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.7, roughness: 0.4 });
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.5), bracketMat);
        bracket.position.set(pos.x, ceilingHeight, pos.z);
        group.add(bracket);

        // Speaker box
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.3, metalness: 0.6 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), boxMat);
        box.position.set(pos.x, ceilingHeight - 0.3, pos.z);
        const downwardAngle = 0.4;
        box.rotation.x = downwardAngle;
        box.castShadow = true;
        group.add(box);

        // Downward-facing cone
        const coneMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5 });
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.06, 16), coneMat);
        cone.position.set(pos.x, ceilingHeight - 0.5, pos.z);
        cone.rotation.x = downwardAngle;
        group.add(cone);
        heightConeMats.push(coneMat);

        scene.add(group);
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

      // Animation loop
      let lastTime = performance.now();
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        // Hologram rotation
        hologram.rotation.y += delta * 0.5;
        hologram.rotation.x += delta * 0.3;
        core.rotation.y -= delta * 0.7;
        core.rotation.z += delta * 0.4;

        // Hologram bob
        hologram.position.y = 2.5 + Math.sin(time * 0.001) * 0.15;
        core.position.y = hologram.position.y;

        // Speaker cone pulse
        const pulseIntensity = 0.5 + Math.sin(time * 0.004) * 0.3;
        for (const mat of earConeMats) {
          mat.emissiveIntensity = pulseIntensity;
        }
        for (const mat of heightConeMats) {
          mat.emissiveIntensity = pulseIntensity * 0.8;
        }

        // Pedestal ring glow
        ringMat.emissiveIntensity = 0.3 + Math.sin(time * 0.002) * 0.15;

        // Indigo point light pulse
        const lc = lightRef.current;
        indigoPointLight.color.setHex(lc.color);
        indigoPointLight.intensity = lc.intensity + Math.sin(time * 0.003) * (lc.intensity * 0.15);
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

  if (Platform.OS !== "web") {
    return <Screen3DFallback title="SPATIAL AUDIO" icon="🔊" />;
  }

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70">
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">SPATIAL AUDIO</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">🔊</Text>
            <Text className="text-white font-bold text-lg">Loading Spatial Audio...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🔊</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}
        {threeLoaded && !loadError && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🎮 Drag to orbit • Scroll to zoom</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={6} />
      </View>
    </View>
  );
}
