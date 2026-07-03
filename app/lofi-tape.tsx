import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const THREE_CDNS = [
  "https://unpkg.com/three@0.160.0/build/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
];

const ACCENT = 0xff5500;
const CAM_POS = [0, 5, 8] as [number, number, number];
const TARGET = [0, 1.5, -2] as [number, number, number];

export default function LofiTape() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x403020, 0.6);
      scene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
      dirLight.position.set(5, 8, 5);
      scene.add(dirLight);
      const accentLight = new THREE.PointLight(ACCENT, 3, 15);
      accentLight.position.set(0, 4, -2);
      scene.add(accentLight);
      const fillLight = new THREE.PointLight(0x3b82f6, 0.5, 12);
      fillLight.position.set(-4, 3, -1);
      scene.add(fillLight);

      // Floor
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      // Grid
      scene.add(new THREE.GridHelper(16, 16, ACCENT, 0x222233));

      // Back wall
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9 });
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
      backWall.position.set(0, 3, -6);
      scene.add(backWall);

      // Desk
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 0.7 });
      const desk = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 2.2), deskMat);
      desk.position.set(0, 1.4, -2);
      desk.castShadow = true;
      desk.receiveShadow = true;
      scene.add(desk);

      // Desk legs
      for (const [lx, lz] of [[-2.2, -0.8], [2.2, -0.8], [-2.2, 0.8], [2.2, 0.8]]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.4),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.8 })
        );
        leg.position.set(lx, 0.7, lz - 2);
        scene.add(leg);
      }

      // === REEL-TO-REEL TAPE DECK ===
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.3 });

      // Deck body
      const deckBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.8), deckMat);
      deckBody.position.set(0, 1.65, -2);
      deckBody.castShadow = true;
      scene.add(deckBody);

      // Deck top plate (silver)
      const topPlate = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.04, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 })
      );
      topPlate.position.set(0, 1.82, -2);
      scene.add(topPlate);

      // Left reel
      const leftReelGroup = new THREE.Group();
      leftReelGroup.position.set(-0.9, 1.84, -2);
      const leftReel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.06, 32),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 })
      );
      leftReelGroup.add(leftReel);
      // Tape on left reel (wider cylinder to show tape spool)
      const leftTape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.04, 32),
        new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 })
      );
      leftReelGroup.add(leftTape);
      // Reel hub
      const leftHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16),
        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9 })
      );
      leftReelGroup.add(leftHub);
      // Spokes
      for (let i = 0; i < 6; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.6, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 })
        );
        spoke.rotation.z = (Math.PI / 3) * i;
        leftReelGroup.add(spoke);
      }
      scene.add(leftReelGroup);

      // Right reel
      const rightReelGroup = new THREE.Group();
      rightReelGroup.position.set(0.9, 1.84, -2);
      const rightReel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.06, 32),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 })
      );
      rightReelGroup.add(rightReel);
      // Tape on right reel (smaller, building up)
      const rightTape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.04, 32),
        new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 })
      );
      rightReelGroup.add(rightTape);
      // Reel hub
      const rightHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16),
        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9 })
      );
      rightReelGroup.add(rightHub);
      // Spokes
      for (let i = 0; i < 6; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.6, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 })
        );
        spoke.rotation.z = (Math.PI / 3) * i;
        rightReelGroup.add(spoke);
      }
      scene.add(rightReelGroup);

      // Tape path between reels (thin brown plane)
      const tapePath = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 })
      );
      tapePath.rotation.x = -Math.PI / 2;
      tapePath.position.set(0, 1.84, -2);
      scene.add(tapePath);

      // Head block (center of tape path)
      const headBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 })
      );
      headBlock.position.set(0, 1.84, -2);
      scene.add(headBlock);

      // === TRANSPORT BUTTONS ===
      const buttonMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
      const playBtn = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.15), buttonMat);
      playBtn.position.set(-0.5, 1.52, -1.25);
      scene.add(playBtn);
      const playIndicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 0.08),
        new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.8 })
      );
      playIndicator.position.set(-0.5, 1.55, -1.25);
      scene.add(playIndicator);

      const stopBtn = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.15), buttonMat);
      stopBtn.position.set(0, 1.52, -1.25);
      scene.add(stopBtn);
      const stopIndicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0x000000 })
      );
      stopIndicator.position.set(0, 1.55, -1.25);
      scene.add(stopIndicator);

      const recBtn = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.15), buttonMat);
      recBtn.position.set(0.5, 1.52, -1.25);
      scene.add(recBtn);
      const recIndicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x000000 })
      );
      recIndicator.position.set(0.5, 1.55, -1.25);
      scene.add(recIndicator);

      // === VACUUM TUBES ===
      const tubeGroup = new THREE.Group();
      const tubes: ThreeAny[] = [];
      const filaments: ThreeAny[] = [];
      const tubePositions = [-1.2, 0, 1.2];

      for (let i = 0; i < 3; i++) {
        const tubeAssembly = new THREE.Group();
        tubeAssembly.position.set(tubePositions[i], 1.82, -2.3);

        // Glass cylinder
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.25,
          roughness: 0.1,
          metalness: 0.0,
        });
        const glassTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16, 1, true),
          glassMat
        );
        tubeAssembly.add(glassTube);

        // Glass top cap
        const capMat = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.6,
          roughness: 0.3,
        });
        const topCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.08, 0.04, 16),
          capMat
        );
        topCap.position.y = 0.25;
        tubeAssembly.add(topCap);

        // Inner filament (glowing)
        const filamentMat = new THREE.MeshStandardMaterial({
          color: 0xff4400,
          emissive: 0xff4400,
          emissiveIntensity: 0.5,
        });
        const filament = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
          filamentMat
        );
        filament.position.y = 0;
        tubeAssembly.add(filament);
        filaments.push(filament);

        // Filament glow point light
        const filamentGlow = new THREE.PointLight(0xff4400, 0.3, 2);
        filamentGlow.position.y = 0;
        tubeAssembly.add(filamentGlow);

        // Base pin
        const basePin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16),
          new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
        );
        basePin.position.y = -0.25;
        tubeAssembly.add(basePin);

        tubeAssembly.userData = { isTube: true, index: i, driveLevel: 0 };
        tubes.push(tubeAssembly);
        tubeGroup.add(tubeAssembly);
      }
      scene.add(tubeGroup);

      // === VU METERS ===
      const vuMeters: ThreeAny[] = [];
      const vuNeedles: ThreeAny[] = [];

      for (let i = 0; i < 2; i++) {
        const vuGroup = new THREE.Group();
        vuGroup.position.set(-0.5 + i * 1.0, 1.55, -1.55);

        // Meter body
        const meterBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.35, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
        );
        vuGroup.add(meterBody);

        // Meter face (cream)
        const meterFace = new THREE.Mesh(
          new THREE.PlaneGeometry(0.42, 0.28),
          new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.9 })
        );
        meterFace.position.z = 0.035;
        meterFace.position.y = 0.02;
        vuGroup.add(meterFace);

        // Scale markings
        for (let s = 0; s < 11; s++) {
          const angle = -Math.PI / 4 + (Math.PI / 2) * (s / 10);
          const markLen = s % 5 === 0 ? 0.04 : 0.02;
          const mark = new THREE.Mesh(
            new THREE.BoxGeometry(0.008, markLen, 0.005),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
          );
          const r = 0.12;
          mark.position.set(Math.sin(angle) * r, 0.02 + Math.cos(angle) * r, 0.04);
          mark.rotation.z = -angle;
          vuGroup.add(mark);
        }

        // Needle pivot
        const pivot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8),
          new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
        );
        pivot.rotation.x = Math.PI / 2;
        pivot.position.set(0, -0.08, 0.04);
        vuGroup.add(pivot);

        // Needle (thin box)
        const needle = new THREE.Mesh(
          new THREE.BoxGeometry(0.005, 0.12, 0.005),
          new THREE.MeshStandardMaterial({ color: 0xcc0000 })
        );
        needle.position.set(0, -0.02, 0.04);
        needle.rotation.z = 0;
        vuGroup.add(needle);
        vuNeedles.push(needle);

        // "VU" label
        const vuLabel = new THREE.Mesh(
          new THREE.PlaneGeometry(0.15, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        vuLabel.position.set(0, -0.12, 0.04);
        vuGroup.add(vuLabel);

        vuMeters.push(vuGroup);
        scene.add(vuGroup);
      }

      // === ORBIT CONTROLS (manual) ===
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

      renderer.domElement.addEventListener("mousedown", (e: MouseEvent) => {
        isDragging = true;
        lastMX = e.clientX;
        lastMY = e.clientY;
      });
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
        if (e.touches.length === 1) {
          isDragging = true;
          lastMX = e.touches[0].clientX;
          lastMY = e.touches[0].clientY;
        }
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

      // Raycaster for tube click detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      renderer.domElement.addEventListener("click", (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const allTubeMeshes: ThreeAny[] = [];
        tubes.forEach(tube => {
          tube.traverse((child: ThreeAny) => {
            if (child.isMesh) allTubeMeshes.push(child);
          });
        });

        const intersects = raycaster.intersectObjects(allTubeMeshes);
        if (intersects.length > 0) {
          let hitObj: ThreeAny = intersects[0].object;
          let parentTube: ThreeAny | null = null;
          while (hitObj) {
            if (hitObj.userData && hitObj.userData.isTube) {
              parentTube = hitObj;
              break;
            }
            hitObj = hitObj.parent;
          }
          if (parentTube) {
            parentTube.userData.driveLevel = (parentTube.userData.driveLevel + 1) % 4;
            const level = parentTube.userData.driveLevel;
            for (const f of filaments) {
              f.material.emissiveIntensity = 0.3 + level * 0.4;
            }
          }
        }
      });

      // Animation loop
      let lastTime = performance.now();
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        // Spin reels in opposite directions
        leftReelGroup.rotation.y += delta * 1.5;
        rightReelGroup.rotation.y -= delta * 1.5;

        // VU needle oscillation
        for (let i = 0; i < vuNeedles.length; i++) {
          const offset = i * Math.PI * 0.5;
          const angle = Math.sin(time * 0.002 + offset) * 0.3;
          vuNeedles[i].rotation.z = angle;
        }

        // Filament pulse
        for (const f of filaments) {
          const base = f.material.emissiveIntensity;
          f.material.emissiveIntensity = base + Math.sin(time * 0.005) * 0.1;
        }

        // Accent light pulse
        accentLight.intensity = 3 + Math.sin(time * 0.003) * 0.5;

        // Transport button pulse (play)
        playIndicator.material.emissiveIntensity = 0.6 + Math.sin(time * 0.004) * 0.2;

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
          <Text className="text-white font-bold text-base">TAPE LAB</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">🎞️</Text>
            <Text className="text-white font-bold text-lg">Loading Tape Lab...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🎞️</Text>
            <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
          </View>
        )}
        {threeLoaded && !loadError && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">🎮 Drag to orbit • Scroll to zoom • Click tubes to adjust drive</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
