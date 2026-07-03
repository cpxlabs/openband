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

const ACCENT = 0xef4444;
const CAM_POS = [0, 5, 8] as [number, number, number];
const TARGET = [0, 1.5, -2] as [number, number, number];

export default function LiveRoom() {
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

      // Back wall
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.9 });
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
      backWall.position.set(0, 3, -6);
      scene.add(backWall);

      // Red drum rug
      const rugMat = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.9 });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), rugMat);
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.01, -2);
      rug.receiveShadow = true;
      scene.add(rug);

      // ─── 5-PIECE DRUM KIT ───
      const drumShellMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3, metalness: 0.1 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.2, metalness: 0.9 });
      const drumHeadMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ed, roughness: 0.6 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.3, metalness: 0.8 });
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.5 });

      const cymbalRefs: ThreeAny[] = [];

      // Bass drum (large cylinder, lying on its side)
      const bassDrum = new THREE.Group();
      const bdShell = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 32), drumShellMat);
      bdShell.rotation.z = Math.PI / 2;
      bdShell.castShadow = true;
      bassDrum.add(bdShell);
      // Front head
      const bdHead = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.02, 32), drumHeadMat);
      bdHead.rotation.z = Math.PI / 2;
      bdHead.position.x = 0.36;
      bassDrum.add(bdHead);
      // Bass drum hoop rings
      for (const side of [-1, 1]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 8, 32), chromeMat);
        hoop.position.x = side * 0.36;
        hoop.rotation.y = Math.PI / 2;
        bassDrum.add(hoop);
      }
      bassDrum.position.set(0, 0.9, -3.5);
      scene.add(bassDrum);

      // Snare drum (red cylinder, elevated on stand)
      const snareGroup = new THREE.Group();
      const snareShell = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 32), drumShellMat);
      snareShell.castShadow = true;
      snareGroup.add(snareShell);
      const snareHead = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.01, 32), drumHeadMat);
      snareHead.position.y = 0.095;
      snareGroup.add(snareHead);
      const snareRim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 32), chromeMat);
      snareRim.rotation.x = Math.PI / 2;
      snareRim.position.y = 0.095;
      snareGroup.add(snareRim);
      // Snare stand
      const snareLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), chromeMat);
      snareLeg.position.y = -0.5;
      snareGroup.add(snareLeg);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), chromeMat);
        foot.position.set(Math.cos(angle) * 0.15, -0.9, Math.sin(angle) * 0.15);
        foot.rotation.z = Math.cos(angle) * 0.4;
        foot.rotation.x = -Math.sin(angle) * 0.4;
        snareGroup.add(foot);
      }
      snareGroup.position.set(-0.8, 1.0, -2.2);
      snareGroup.rotation.y = 0.3;
      scene.add(snareGroup);

      // Floor tom
      const ftGroup = new THREE.Group();
      const ftShell = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 32), drumShellMat);
      ftShell.castShadow = true;
      ftGroup.add(ftShell);
      const ftHead = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.01, 32), drumHeadMat);
      ftHead.position.y = 0.18;
      ftGroup.add(ftHead);
      const ftRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 32), chromeMat);
      ftRim.rotation.x = Math.PI / 2;
      ftRim.position.y = 0.18;
      ftGroup.add(ftRim);
      // Floor tom legs
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), chromeMat);
        leg.position.set(Math.cos(angle) * 0.3, -0.35, Math.sin(angle) * 0.3);
        leg.rotation.z = Math.cos(angle) * 0.3;
        leg.rotation.x = -Math.sin(angle) * 0.3;
        ftGroup.add(leg);
      }
      ftGroup.position.set(1.2, 0.7, -2);
      scene.add(ftGroup);

      // Hi-hat
      const hhGroup = new THREE.Group();
      // Stand
      const hhStand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.4, 8), chromeMat);
      hhStand.position.y = -0.7;
      hhGroup.add(hhStand);
      // Base
      const hhBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), chromeMat);
      hhBase.position.y = -1.4;
      hhGroup.add(hhBase);
      // Bottom cymbal
      const hhBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.015, 32), brassMat);
      hhBottom.castShadow = true;
      hhGroup.add(hhBottom);
      // Top cymbal (slightly raised)
      const hhTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.015, 32), brassMat);
      hhTop.position.y = 0.04;
      hhTop.castShadow = true;
      hhGroup.add(hhTop);
      cymbalRefs.push(hhTop);
      hhGroup.position.set(-1.4, 1.45, -2.5);
      scene.add(hhGroup);

      // Crash cymbal on stand (left)
      const crashGroup = new THREE.Group();
      const crashStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 8), chromeMat);
      crashStand.position.y = -0.9;
      crashGroup.add(crashStand);
      const crashBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16), chromeMat);
      crashBase.position.y = -1.8;
      crashGroup.add(crashBase);
      const crashCymbal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.015, 32), brassMat);
      crashCymbal.position.y = 0.05;
      crashCymbal.rotation.x = 0.15;
      crashCymbal.castShadow = true;
      crashGroup.add(crashCymbal);
      cymbalRefs.push(crashCymbal);
      crashGroup.position.set(-1.8, 1.5, -3);
      scene.add(crashGroup);

      // Ride cymbal on stand (right)
      const rideGroup = new THREE.Group();
      const rideStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.6, 8), chromeMat);
      rideStand.position.y = -0.8;
      rideGroup.add(rideStand);
      const rideBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16), chromeMat);
      rideBase.position.y = -1.6;
      rideGroup.add(rideBase);
      const rideCymbal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.015, 32), brassMat);
      rideCymbal.position.y = 0.05;
      rideCymbal.rotation.x = 0.1;
      rideCymbal.castShadow = true;
      rideGroup.add(rideCymbal);
      cymbalRefs.push(rideCymbal);
      rideGroup.position.set(1.6, 1.5, -3);
      scene.add(rideGroup);

      // ─── GUITAR AMP HALF-STACK (right side) ───
      // 4x12 Cabinet
      const cabGroup = new THREE.Group();
      const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.6), blackMat);
      cabBody.castShadow = true;
      cabGroup.add(cabBody);
      // Cabinet corners
      for (const [cx, cy] of [[-0.55, 0.45], [0.55, 0.45], [-0.55, -0.45], [0.55, -0.45]]) {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), chromeMat);
        corner.position.set(cx, cy, 0.31);
        cabGroup.add(corner);
      }
      // Grill cloth
      const grillMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
      const grill = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), grillMat);
      grill.position.set(0, 0, 0.31);
      cabGroup.add(grill);
      // 4 speakers behind grill
      for (const [sx, sy] of [[-0.25, 0.2], [0.25, 0.2], [-0.25, -0.2], [0.25, -0.2]]) {
        const speaker = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
        speaker.position.set(sx, sy, 0.315);
        cabGroup.add(speaker);
        // Speaker dust cap
        const dustCap = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        dustCap.position.set(sx, sy, 0.318);
        cabGroup.add(dustCap);
      }
      // Cabinet handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), chromeMat);
      handle.position.set(0, 0.52, 0.32);
      cabGroup.add(handle);
      cabGroup.position.set(2.8, 0.5, -3);
      scene.add(cabGroup);

      // Amp head
      const headGroup = new THREE.Group();
      const headBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.5), blackMat);
      headBody.castShadow = true;
      headGroup.add(headBody);
      // Front panel
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), panelMat);
      panel.position.set(0, 0, 0.26);
      headGroup.add(panel);
      // Knobs
      const knobMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3 });
      for (let i = 0; i < 5; i++) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), knobMat);
        knob.position.set(-0.3 + i * 0.15, -0.02, 0.28);
        knob.rotation.x = Math.PI / 2;
        headGroup.add(knob);
      }
      // Power switch
      const pwrSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x444444 }));
      pwrSwitch.position.set(0.42, -0.02, 0.28);
      headGroup.add(pwrSwitch);
      // Glowing red pilot light
      const pilotLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 16, 16),
        new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 2.0 })
      );
      pilotLight.position.set(0.48, 0.06, 0.28);
      headGroup.add(pilotLight);
      // Pilot light glow
      const pilotGlow = new THREE.PointLight(ACCENT, 1.2, 2.5);
      pilotGlow.position.set(0.48, 0.06, 0.35);
      headGroup.add(pilotGlow);
      headGroup.position.set(2.8, 1.18, -3);
      scene.add(headGroup);

      // ─── Orbit controls (manual) ───
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
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Cymbal shimmer — tiny rotation oscillation
        for (const c of cymbalRefs) {
          c.rotation.y += Math.sin(time * 0.004) * 0.002;
          c.rotation.x += Math.cos(time * 0.003) * 0.001;
        }

        // Pilot light pulse
        pilotLight.material.emissiveIntensity = 1.5 + Math.sin(time * 0.005) * 0.8;
        pilotGlow.intensity = 1.0 + Math.sin(time * 0.005) * 0.5;

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
          <Text className="text-white font-bold text-base">LIVE ROOM</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">🥁</Text>
            <Text className="text-white font-bold text-lg">Loading Live Room...</Text>
          </View>
        )}
        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🥁</Text>
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
