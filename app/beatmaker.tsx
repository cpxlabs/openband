import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";
import { Screen3DFallback } from "../src/components";
import { loadThree } from "../src/lib/loadThree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const ACCENT = 0xff0055;
const ROOM_W = 12;
const ROOM_D = 12;
const ROOM_H = 6;

export default function BeatmakerStudio() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: ACCENT, intensity: 5 });

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
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.Fog(0x0a0a0f, 14, 25);

      // Perspective Camera
      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.set(0, 3, 8);
      camera.lookAt(0, 1, -1);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // --- Lighting ---
      const ambientLight = new THREE.AmbientLight(0x606080, 1.0);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
      mainLight.position.set(3, 8, 4);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 1024;
      mainLight.shadow.mapSize.height = 1024;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 30;
      mainLight.shadow.camera.left = -10;
      mainLight.shadow.camera.right = 10;
      mainLight.shadow.camera.top = 10;
      mainLight.shadow.camera.bottom = -10;
      scene.add(mainLight);

      const accentLight = new THREE.PointLight(ACCENT, 5, 20);
      accentLight.position.set(0, 4, -3);
      scene.add(accentLight);

      const fillLight = new THREE.PointLight(0x3b82f6, 1.2, 15);
      fillLight.position.set(-5, 3, 3);
      scene.add(fillLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: ACCENT });

      // --- Floor ---
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.7,
        metalness: 0.3,
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Grid
      const grid = new THREE.GridHelper(ROOM_W, ROOM_W, 0x334155, 0x1e293b);
      scene.add(grid);

      // --- Walls ---
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.7,
      });

      // Back wall
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
      backWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
      backWall.receiveShadow = true;
      scene.add(backWall);

      // --- Acoustic panels on back wall ---
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x2d2d3d,
        roughness: 0.9,
        metalness: 0.1,
      });
      const panelGroup = new THREE.Group();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), panelMat);
          panel.position.set(-3 + col * 1.5, 1.5 + row * 1.5, -ROOM_D / 2 + 0.06);
          panelGroup.add(panel);
        }
      }
      scene.add(panelGroup);

      // --- Studio Desk ---
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.6, metalness: 0.2 });
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 1.8), deskMat);
      deskTop.position.set(0, 1, -3);
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      scene.add(deskTop);

      // Desk legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
      const legPositions = [[-2.3, -3.8], [-2.3, -2.2], [2.3, -3.8], [2.3, -2.2]];
      for (const [lx, lz] of legPositions) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), legMat);
        leg.position.set(lx, 0.5, lz);
        leg.castShadow = true;
        scene.add(leg);
      }

      // --- MPC Drum Pads (4x4 grid) ---
      const padGroup = new THREE.Group();
      const padMeshes: ThreeAny[] = [];
      const padSize = 0.5;
      const padGap = 0.08;
      const deskZ = -3;
      const deskY = 1.075;
      const startX = -((padSize + padGap) * 3) / 2;

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const px = startX + col * (padSize + padGap);
          const pz = deskZ + 0.3 + row * (padSize + padGap);

          const padBase = new THREE.Mesh(
            new THREE.BoxGeometry(padSize, 0.05, padSize),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
          );
          padBase.position.set(px, deskY, pz);
          padGroup.add(padBase);

          const padColor = new THREE.Color(ACCENT);
          const padSurface = new THREE.Mesh(
            new THREE.BoxGeometry(padSize - 0.06, 0.02, padSize - 0.06),
            new THREE.MeshStandardMaterial({
              color: padColor,
              emissive: padColor,
              emissiveIntensity: 0.6 + Math.sin(row * 1.5 + col * 0.8) * 0.3,
              roughness: 0.3,
              metalness: 0.4,
            })
          );
          padSurface.position.set(px, deskY + 0.035, pz);
          padGroup.add(padSurface);
          padMeshes.push(padSurface);
        }
      }
      scene.add(padGroup);

      // --- Studio Monitors (left and right) ---
      const monitorGroup = new THREE.Group();
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        emissive: 0xffcc00,
        emissiveIntensity: 0.15,
        roughness: 0.3,
        metalness: 0.5,
      });
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.3 });

      for (const side of [-1, 1]) {
        const mx = side * 2.2;
        const mz = deskZ - 0.4;

        // Speaker body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), bodyMat);
        body.position.set(mx, 1.55, mz);
        body.castShadow = true;
        monitorGroup.add(body);

        // Yellow woofer cone
        const woofer = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), coneMat);
        woofer.position.set(mx, 1.4, mz + 0.26);
        monitorGroup.add(woofer);

        // Tweeter
        const tweeter = new THREE.Mesh(
          new THREE.CircleGeometry(0.08, 16),
          new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
        );
        tweeter.position.set(mx, 1.7, mz + 0.26);
        monitorGroup.add(tweeter);

        // LED indicator
        const led = new THREE.Mesh(
          new THREE.CircleGeometry(0.02, 8),
          new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1 })
        );
        led.position.set(mx + 0.25, 1.15, mz + 0.26);
        monitorGroup.add(led);
      }
      scene.add(monitorGroup);

      // --- Floating Waveform Bars ---
      const waveformGroup = new THREE.Group();
      const barCount = 20;
      const barWidth = 0.12;
      const barGap = 0.04;
      const waveformXStart = -((barWidth + barGap) * barCount) / 2;

      const barMeshes: ThreeAny[] = [];
      for (let i = 0; i < barCount; i++) {
        const h = 0.3 + Math.random() * 1.5;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(barWidth, h, 0.05),
          new THREE.MeshStandardMaterial({
            color: ACCENT,
            emissive: ACCENT,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.85,
            roughness: 0.2,
            metalness: 0.6,
          })
        );
        bar.position.set(waveformXStart + i * (barWidth + barGap), 2.5 + h / 2, -1.5);
        waveformGroup.add(bar);
        barMeshes.push(bar);
      }
      scene.add(waveformGroup);

      // --- OrbitControls-like mouse drag rotation ---
      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;
      let rotY = 0;
      let rotX = 0.3;
      const radius = 8;
      const lookAtTarget = new THREE.Vector3(0, 1, -1);
      const sensitivity = 0.005;

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        rotY += deltaX * sensitivity;
        rotX += deltaY * sensitivity;
        rotX = Math.max(-1, Math.min(1.2, rotX));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      renderer.domElement.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      // Scroll zoom
      const handleWheel = (e: WheelEvent) => {
        const zoomDelta = e.deltaY * 0.005;
        camera.position.z += zoomDelta;
        camera.position.z = Math.max(3, Math.min(15, camera.position.z));
      };
      renderer.domElement.addEventListener("wheel", handleWheel);

      // --- Animation Loop ---
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Smooth camera orbit
        const targetX = radius * Math.sin(rotY) * Math.cos(rotX);
        const targetY = lookAtTarget.y + radius * Math.sin(rotX);
        const targetZ = lookAtTarget.z + radius * Math.cos(rotY) * Math.cos(rotX);

        camera.position.x += (targetX + lookAtTarget.x - camera.position.x) * 0.08;
        camera.position.y += (targetY - camera.position.y) * 0.08;
        camera.position.z += (targetZ - camera.position.z) * 0.08;
        camera.lookAt(lookAtTarget);

        // Pad glow pulse
        for (let i = 0; i < padMeshes.length; i++) {
          const pulse = 0.4 + Math.sin(time * 0.003 + i * 0.7) * 0.35;
          padMeshes[i].material.emissiveIntensity = pulse;
        }

        // Waveform bars animation
        for (let i = 0; i < barMeshes.length; i++) {
          const wave = Math.sin(time * 0.005 + i * 0.5) * 0.5 + 0.5;
          const baseH = 0.3;
          const maxH = 2;
          const targetH = baseH + wave * maxH;
          barMeshes[i].scale.y = targetH / (baseH + barMeshes[i].geometry.parameters.height * 0.5);
          barMeshes[i].position.y = 2.5 + (barMeshes[i].geometry.parameters.height * barMeshes[i].scale.y) / 2;
        }

        // Accent light pulse
        const lc = lightRef.current;
        accentLight.color.setHex(lc.color);
        accentLight.intensity = lc.intensity + Math.sin(time * 0.004) * (lc.intensity * 0.2);
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
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("wheel", handleWheel);
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
    return <Screen3DFallback title="BEATMAKER STUDIO" icon="🥁" />;
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
          <Text className="text-white font-bold text-base">BEATMAKER STUDIO</Text>
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
            <Text className="text-4xl mb-3">🥁</Text>
            <Text className="text-white font-bold text-lg">Loading Beatmaker Studio...</Text>
          </View>
        )}

        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🥁</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}

        {/* Controls hint */}
        {threeLoaded && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🖱 Drag to orbit • Scroll to zoom</Text>
            </View>
          </View>
        )}
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={5} />
      </View>
    </View>
  );
}
