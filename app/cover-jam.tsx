import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";
import { Screen3DFallback } from "../src/components";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const THREE_CDNS = [
  "https://unpkg.com/three@0.160.0/build/three.module.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
];

const ACCENT = 0x00e5ff;
const TARGET = [0, 2, -2] as [number, number, number];

interface StemPedal {
  id: string;
  label: string;
  color: number;
  x: number;
}

const PEDALS: StemPedal[] = [
  { id: "vocals", label: "VOCAL CUT", color: 0xec4899, x: -1.8 },
  { id: "guitar", label: "GUITAR CUT", color: 0xf59e0b, x: -0.6 },
  { id: "bass", label: "BASS CUT", color: 0x10b981, x: 0.6 },
  { id: "drums", label: "DRUM CUT", color: 0x3b82f6, x: 1.8 },
];

export default function CoverJamStudio() {
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
      camera.position.set(0, 5, 8);

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x505070, 1.0));
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
      dirLight.position.set(5, 8, 5);
      scene.add(dirLight);
      const accentLight = new THREE.PointLight(ACCENT, 6, 20);
      accentLight.position.set(0, 4, -2);
      scene.add(accentLight);
      const fillLight = new THREE.PointLight(0x7c3aed, 1.8, 15);
      fillLight.position.set(-4, 3, -1);
      scene.add(fillLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: ACCENT });

      // Floor
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      scene.add(new THREE.GridHelper(16, 16, ACCENT, 0x222233));

      // Back wall
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9 }));
      backWall.position.set(0, 3, -6);
      scene.add(backWall);

      // 1. Massive curved video screen backdrop
      const screenGroup = new THREE.Group();
      screenGroup.position.set(0, 3.2, -4.5);
      const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.8 }));
      screenFrame.castShadow = true;
      screenGroup.add(screenFrame);
      const screenDisplay = new THREE.Mesh(new THREE.PlaneGeometry(8.1, 4.1), new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x311042, emissiveIntensity: 0.6 }));
      screenDisplay.position.z = 0.12;
      screenGroup.add(screenDisplay);
      scene.add(screenGroup);

      // 2. Stage floor
      const stageFloor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 5), new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.4 }));
      stageFloor.position.set(0, 0, -2);
      stageFloor.receiveShadow = true;
      scene.add(stageFloor);

      // 3. Visual metronome LED edge bar
      const metroBar = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.04, 0.15), new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.8 }));
      metroBar.position.set(0, 0.06, -0.2);
      scene.add(metroBar);

      // 4. Floating chord/tab HUD teleprompter
      const hudGroup = new THREE.Group();
      hudGroup.position.set(0, 2.2, -2.5);
      const hudScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
      hudGroup.add(hudScreen);
      const hudFrame = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.9, 0.02), new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.5 }));
      hudFrame.position.z = -0.01;
      hudGroup.add(hudFrame);
      scene.add(hudGroup);

      // 5. Floor stompboxes (stem elimination controls)
      const pedalObjects: ThreeAny[] = [];
      const pedalLeds: ThreeAny[] = [];
      const cutStems: Record<string, boolean> = { guitar: true };

      for (const pedal of PEDALS) {
        const pedalGroup = new THREE.Group();
        pedalGroup.position.set(pedal.x, 0.1, -1.2);

        // Pedal base chassis
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 1.1), new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.6, roughness: 0.3 }));
        base.castShadow = true;
        base.userData.pedalId = pedal.id;
        pedalGroup.add(base);

        // Foot switch button
        const footSwitch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9 }));
        footSwitch.position.set(0, 0.1, 0.2);
        pedalGroup.add(footSwitch);

        // LED indicator
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshStandardMaterial({ color: cutStems[pedal.id] ? pedal.color : 0x111111, emissive: cutStems[pedal.id] ? pedal.color : 0x000000, emissiveIntensity: cutStems[pedal.id] ? 2.2 : 0 }));
        led.position.set(0, 0.09, -0.3);
        pedalGroup.add(led);
        pedalLeds.push({ mesh: led, color: pedal.color, id: pedal.id });

        scene.add(pedalGroup);
        pedalObjects.push(base);
      }

      // 6. Practice speed control pod
      const speedGroup = new THREE.Group();
      speedGroup.position.set(3, 0.6, -1);
      speedGroup.rotation.y = -0.4;
      const speedBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.2 }));
      speedBody.castShadow = true;
      speedGroup.add(speedBody);
      const speedDial = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x6d28d9, emissiveIntensity: 0.5 }));
      speedDial.position.set(0, 0.42, 0);
      speedDial.userData.isSpeedDial = true;
      speedGroup.add(speedDial);
      scene.add(speedGroup);

      // State refs for animation loop
      let speedIdx = 2;

      // Click handling via raycaster
      renderer.domElement.addEventListener("click", (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Check pedal clicks
        for (const pedal of pedalObjects) {
          const hits = raycaster.intersectObject(pedal);
          if (hits.length > 0) {
            const id = pedal.userData.pedalId;
            cutStems[id] = !cutStems[id];
            for (const led of pedalLeds) {
              if (led.id === id) {
                led.mesh.material.color.setHex(cutStems[id] ? led.color : 0x111111);
                led.mesh.material.emissive.setHex(cutStems[id] ? led.color : 0x000000);
                led.mesh.material.emissiveIntensity = cutStems[id] ? 2.2 : 0;
              }
            }
            return;
          }
        }

        // Check speed dial click
        for (const child of speedGroup.children) {
          if (child.userData.isSpeedDial) {
            const hits = raycaster.intersectObject(child);
            if (hits.length > 0) {
              speedIdx = (speedIdx + 1) % 3;
              return;
            }
          }
        }
      });

      // Orbit controls
      let sphericalTheta = 0.3;
      let sphericalPhi = Math.PI / 4;
      let sphericalRadius = 9;
      let isDragging = false;
      let lastMX = 0;
      let lastMY = 0;

      const updateCamera = () => {
        camera.position.set(
          TARGET[0] + sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta),
          TARGET[1] + sphericalRadius * Math.cos(sphericalPhi),
          TARGET[2] + sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta)
        );
        camera.lookAt(TARGET[0], TARGET[1], TARGET[2]);
      };
      updateCamera();

      renderer.domElement.addEventListener("mousedown", (e: MouseEvent) => { isDragging = true; lastMX = e.clientX; lastMY = e.clientY; });
      window.addEventListener("mousemove", (e: MouseEvent) => {
        if (!isDragging) return;
        sphericalTheta -= (e.clientX - lastMX) * 0.005;
        sphericalPhi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, sphericalPhi - (e.clientY - lastMY) * 0.005));
        lastMX = e.clientX; lastMY = e.clientY;
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
          lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY;
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

      // Animation
      let beatCount = 0;
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const elapsed = time * 0.001;

        // Visual metronome (120 BPM = 2 beats/sec)
        const pulse = Math.floor(elapsed * 2) % 4;
        if (pulse !== beatCount) {
          beatCount = pulse;
          const isDownbeat = pulse === 0;
          metroBar.material.color.setHex(isDownbeat ? 0xff003c : 0x00f0ff);
          metroBar.material.emissive.setHex(isDownbeat ? 0xff003c : 0x00f0ff);
          metroBar.material.emissiveIntensity = isDownbeat ? 2.5 : 0.8;
        }

        // HUD float bob
        hudGroup.position.y = 2.2 + Math.sin(elapsed * 1.5) * 0.2;

        // Accent light pulse
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

      const handleResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
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
    return <Screen3DFallback title="COVER JAM STUDIO" icon="🎸" />;
  }

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70">
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">COVER JAM STAGE</Text>
        </View>
        <View className="w-9" />
      </View>
      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">🎸</Text>
            <Text className="text-white font-bold text-lg">Loading Cover Jam Stage...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🎸</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}
        {threeLoaded && !loadError && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🎮 Drag to orbit • Scroll to zoom • Click pedals to cut stems</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={6} />
      </View>
    </View>
  );
}
