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

const ACCENT = 0x00ffaa;
const TARGET = [0, 1.8, -2] as [number, number, number];
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const RETUNE_COLORS = [0xff0055, 0xff5500, 0xffcc00, 0x00ffaa];

export default function AutoTuneStudio() {
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

      // Holographic pitch-correction screen
      const screenGroup = new THREE.Group();
      screenGroup.position.set(0, 2.6, -3.8);
      const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.5 }));
      screenGroup.add(screenFrame);
      const screenGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3), new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.1 }));
      screenGlass.position.z = 0.06;
      screenGroup.add(screenGlass);

      // Pitch grid lines
      for (let i = 0; i < 7; i++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.01), new THREE.MeshStandardMaterial({ color: 0x333344, emissive: 0x333344, emissiveIntensity: 0.5 }));
        line.position.set(0, (i - 3) * 0.4, 0.07);
        screenGroup.add(line);
      }

      // Floating pitch blobs
      const pitchBlobs: ThreeAny[] = [];
      for (let i = 0; i < 14; i++) {
        const x = (i - 6.5) * 0.45;
        const y = Math.round(Math.sin(i * 1.5) * 2) * 0.4;
        const blob = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.04), new THREE.MeshStandardMaterial({ color: RETUNE_COLORS[0], emissive: RETUNE_COLORS[0], emissiveIntensity: 1.2 }));
        blob.position.set(x, y, 0.12);
        blob.userData.baseY = y;
        blob.userData.phase = i * 0.5;
        screenGroup.add(blob);
        pitchBlobs.push(blob);
      }
      scene.add(screenGroup);

      // Console desk
      const desk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x16161e, roughness: 0.3, metalness: 0.8 }));
      desk.position.set(0, 1.3, -1.8);
      desk.rotation.x = 0.25;
      desk.castShadow = true;
      scene.add(desk);

      // Retune speed dial
      const dialGroup = new THREE.Group();
      dialGroup.position.set(-1.3, 1.45, -1.8);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 24), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 }));
      dialGroup.add(dial);
      const dialIndicator = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: RETUNE_COLORS[0], emissive: RETUNE_COLORS[0], emissiveIntensity: 2 }));
      dialIndicator.position.set(0, 0.08, 0.22);
      dialGroup.add(dialIndicator);
      scene.add(dialGroup);

      // Chromatic scale pads
      const scalePads: ThreeAny[] = [];
      const activeNotes = Array(12).fill(true);
      for (let idx = 0; idx < 12; idx++) {
        const note = NOTES[idx];
        const isBlackKey = note.includes("#");
        const col = (idx - 5.5) * 0.22 + 0.5;
        const row = isBlackKey ? -0.25 : 0.25;
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.05, isBlackKey ? 0.35 : 0.45),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00e5ff, emissiveIntensity: 0.8 })
        );
        pad.position.set(col, 1.42, -1.8 + row);
        pad.userData.noteIndex = idx;
        pad.userData.isBlackKey = isBlackKey;
        scene.add(pad);
        scalePads.push(pad);
      }

      // Center stage mic
      const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8 }));
      micBase.position.set(0, 0.05, -0.2);
      scene.add(micBase);
      const micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.7, 16), new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.9 }));
      micPole.position.set(0, 1.4, -0.2);
      scene.add(micPole);
      const micLedRing = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), new THREE.MeshStandardMaterial({ color: RETUNE_COLORS[0], emissive: RETUNE_COLORS[0], emissiveIntensity: 2 }));
      micLedRing.position.set(0, 2.65, -0.2);
      scene.add(micLedRing);
      const micCapsule = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 1, roughness: 0.3, wireframe: true }));
      micCapsule.position.set(0, 2.8, -0.2);
      scene.add(micCapsule);

      // Floor wedge monitors
      for (const [mx, mrot] of [[-1.4, 0.3], [1.4, -0.3]]) {
        const mon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
        mon.position.set(mx, 0.25, -0.5);
        mon.rotation.y = mrot;
        mon.castShadow = true;
        scene.add(mon);
      }

      // Retune mode state
      let retuneMode = 0;

      // Click handling for dial and pads
      renderer.domElement.addEventListener("click", (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Check dial click
        const dialHits = raycaster.intersectObject(dial);
        if (dialHits.length > 0) {
          retuneMode = (retuneMode + 1) % 4;
          dialIndicator.material.color.setHex(RETUNE_COLORS[retuneMode]);
          dialIndicator.material.emissive.setHex(RETUNE_COLORS[retuneMode]);
          micLedRing.material.color.setHex(RETUNE_COLORS[retuneMode]);
          micLedRing.material.emissive.setHex(RETUNE_COLORS[retuneMode]);
          for (const blob of pitchBlobs) {
            blob.material.color.setHex(RETUNE_COLORS[retuneMode]);
            blob.material.emissive.setHex(RETUNE_COLORS[retuneMode]);
          }
          return;
        }

        // Check scale pad clicks
        for (const pad of scalePads) {
          const padHits = raycaster.intersectObject(pad);
          if (padHits.length > 0) {
            const idx = pad.userData.noteIndex;
            activeNotes[idx] = !activeNotes[idx];
            pad.material.color.setHex(activeNotes[idx] ? (pad.userData.isBlackKey ? 0x00e5ff : 0xffffff) : 0x27272a);
            pad.material.emissive.setHex(activeNotes[idx] ? 0x00e5ff : 0x000000);
            pad.material.emissiveIntensity = activeNotes[idx] ? 0.8 : 0;
            return;
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

      // Animation
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Animate pitch blobs
        const isHardTune = retuneMode === 0;
        for (const blob of pitchBlobs) {
          blob.position.y = blob.userData.baseY + Math.sin(time * 0.002 + blob.userData.phase) * (isHardTune ? 0 : 0.15);
          blob.scale.y = isHardTune ? 0.6 : 1;
        }

        // Pulse accent light
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

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70">
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">AUTO-TUNE STUDIO</Text>
        </View>
        <View className="w-9" />
      </View>
      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">🎤</Text>
            <Text className="text-white font-bold text-lg">Loading Auto-Tune Studio...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🎤</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}
        {threeLoaded && !loadError && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🎮 Drag to orbit • Scroll to zoom • Click dial to change retune mode</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={6} />
      </View>
    </View>
  );
}
