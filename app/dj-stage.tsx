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

const ACCENT = 0x10b981;
const CAM_POS = [0, 5, 8] as [number, number, number];
const TARGET = [0, 1.5, -2] as [number, number, number];

export default function DJStudio() {
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
      scene.fog = new THREE.Fog(0x0a0a0f, 12, 25);

      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.set(...CAM_POS);

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x505070, 1.0));
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
      dirLight.position.set(5, 8, 5);
      dirLight.castShadow = true;
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


      // Table legs
      for (const [lx, lz] of [[-2.8, -0.8], [2.8, -0.8], [-2.8, 0.8], [2.8, 0.8]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4), new THREE.MeshStandardMaterial({ color: 0x0a0a0e, metalness: 0.9 }));
        leg.position.set(lx, 0.7, lz - 2);
        scene.add(leg);
      }

      // Turntables
      const vinylRefs: ThreeAny[] = [];
      for (const [tx, labelColor] of [[-1.8, 0x10b981], [1.8, 0xec4899]]) {
        // Turntable body
        const ttBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.6), new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.3 }));
        ttBody.position.set(tx, 1.58, -2);
        ttBody.castShadow = true;
        scene.add(ttBody);

        // Silver platter
        const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 }));
        platter.position.set(tx, 1.65, -2);
        scene.add(platter);

        // Vinyl record
        const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 }));
        vinyl.position.set(tx, 1.67, -2);
        vinyl.castShadow = true;
        scene.add(vinyl);
        vinylRefs.push(vinyl);

        // Center label
        const label = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 32), new THREE.MeshStandardMaterial({ color: labelColor }));
        label.position.set(tx, 1.685, -2);
        scene.add(label);

        // Tonearm
        const armGroup = new THREE.Group();
        armGroup.position.set(tx + 0.6, 1.73, -2.5);
        armGroup.rotation.y = -0.4;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.9 }));
        arm.position.set(0, 0, 0.35);
        arm.rotation.x = Math.PI / 2;
        armGroup.add(arm);
        scene.add(armGroup);
      }

      // Central DJ Mixer
      const mixerBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.6), new THREE.MeshStandardMaterial({ color: 0x18181b }));
      mixerBody.position.set(0, 1.59, -2);
      mixerBody.castShadow = true;
      scene.add(mixerBody);

      // Crossfader
      const xfTrack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0x000 }));
      xfTrack.position.set(0, 1.67, -1.5);
      scene.add(xfTrack);
      const xfKnob = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
      xfKnob.position.set(0.1, 1.69, -1.5);
      scene.add(xfKnob);

      // Channel faders
      for (let i = 0; i < 4; i++) {
        const fx = -0.4 + i * 0.25;
        const fTrack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.4), new THREE.MeshStandardMaterial({ color: 0x09090b }));
        fTrack.position.set(fx, 1.67, -2);
        scene.add(fTrack);
        const fCap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: i === 0 ? 0xef4444 : 0xf4f4f5 }));
        fCap.position.set(fx, 1.7, -2 + (Math.sin(i) * 0.1));
        scene.add(fCap);
      }

      // LED VU meters on mixer
      for (let ch = 0; ch < 4; ch++) {
        const mx = -0.35 + ch * 0.23;
        for (let seg = 0; seg < 8; seg++) {
          const active = seg < 3 + Math.floor(Math.random() * 5);
          const ledColor = seg < 5 ? 0x10b981 : seg < 7 ? 0xfacc15 : 0xef4444;
          const led = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.02, 0.01),
            new THREE.MeshStandardMaterial({ color: ledColor, emissive: active ? ledColor : 0x000000, emissiveIntensity: active ? 1 : 0 })
          );
          led.position.set(mx, 1.64 + seg * 0.025, -1.7);
          scene.add(led);
        }
      }

      // Neon accent strip on table front
      const strip = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.8 }));
      strip.position.set(0, 1.28, -0.8);
      scene.add(strip);

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
        const z = sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalPhi);
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

        // Spin vinyls
        for (const v of vinylRefs) {
          v.rotation.y += delta * 2;
        }

        // Pulsing accent light
        const lc = lightRef.current;
        accentLight.color.setHex(lc.color);
        accentLight.intensity = lc.intensity + Math.sin(time * 0.003) * (lc.intensity * 0.15);
        stripMat.color.setHex(lc.color);
        stripMat.emissive.setHex(lc.color);
        dotMat.color.setHex(lc.color);

        // Random VU meter animation
        scene.traverse((obj: ThreeAny) => {
          if (obj.material && obj.material.emissiveIntensity !== undefined && obj.material.color && obj.material.color.getHex() === ACCENT) {
            // VU meter LEDs are already set; skip
          }
        });

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
          <Text className="text-white font-bold text-base">DJ STAGE</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">💿</Text>
            <Text className="text-white font-bold text-lg">Loading DJ Stage...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">💿</Text>
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
