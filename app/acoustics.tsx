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

const ACCENT = 0x10b981;
const ACCENT_HEX = "#10b981";
const CAM_POS = [0, 5, 8] as [number, number, number];
const TARGET = [0, 2, -2] as [number, number, number];

export default function AcousticsLab() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [treated, setTreated] = useState(true);

  const treatedRef = useRef(true);

  useEffect(() => {
    treatedRef.current = treated;
  }, [treated]);

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
      scene.add(new THREE.AmbientLight(0x303040, 0.5));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 8, 5);
      scene.add(dirLight);
      const accentLight = new THREE.PointLight(ACCENT, 3, 15);
      accentLight.position.set(0, 4, -2);
      scene.add(accentLight);

      // Room shell
      const roomMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a22,
        roughness: 0.15,
        metalness: 0.85,
        side: THREE.DoubleSide,
      });

      // Floor
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), roomMat.clone());
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, -2);
      floor.receiveShadow = true;
      scene.add(floor);

      // Back wall
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), roomMat.clone());
      backWall.position.set(0, 2.5, -7);
      scene.add(backWall);

      // Left wall
      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), roomMat.clone());
      leftWall.position.set(-4, 2.5, -2);
      leftWall.rotation.y = Math.PI / 2;
      scene.add(leftWall);

      // Right wall
      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), roomMat.clone());
      rightWall.position.set(4, 2.5, -2);
      rightWall.rotation.y = -Math.PI / 2;
      scene.add(rightWall);

      // Ceiling
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), roomMat.clone());
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(0, 5, -2);
      scene.add(ceiling);

      // Central listening position marker (X on floor)
      const markerMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5 });
      const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), markerMat);
      m1.position.set(0, 0.01, -2);
      m1.rotation.y = Math.PI / 4;
      scene.add(m1);
      const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.08), markerMat);
      m2.position.set(0, 0.01, -2);
      m2.rotation.y = -Math.PI / 4;
      scene.add(m2);

      // Chair silhouette at listening position
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.6 });
      const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.5), chairMat);
      chairSeat.position.set(0, 0.5, -2);
      scene.add(chairSeat);
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.06), chairMat);
      chairBack.position.set(0, 0.85, -2.22);
      scene.add(chairBack);
      for (const [cx, cz] of [[-0.25, -1.75], [0.25, -1.75], [-0.25, -2.25], [0.25, -2.25]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), new THREE.MeshStandardMaterial({ color: 0x222230 }));
        leg.position.set(cx, 0.25, cz);
        scene.add(leg);
      }

      // Sound wave visualization: expanding rings from center
      const soundWaves: ThreeAny[] = [];
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        const waveMat = new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        const waveGeo = new THREE.RingGeometry(0.05, 0.12, 48);
        const wave = new THREE.Mesh(waveGeo, waveMat);
        wave.rotation.x = -Math.PI / 2;
        wave.position.set(0, 0.05, -2);
        wave.userData = { phase: i * (Math.PI * 2 / waveCount), maxRadius: 4 };
        scene.add(wave);
        soundWaves.push(wave);
      }

      // === Interactive acoustic panels ===
      const clickablePanels: ThreeAny[] = [];
      const panelGroups: { group: ThreeAny; mat: ThreeAny }[] = [];

      // Wood skyline diffusers on back wall
      const diffuserGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.6, metalness: 0.1 });
      const diffuserHeights = [0.8, 1.2, 0.5, 1.5, 0.9, 1.8, 0.6, 1.1, 0.7];
      for (let i = 0; i < diffuserHeights.length; i++) {
        const h = diffuserHeights[i];
        const w = 0.35;
        const d = 0.3;
        const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat.clone());
        block.position.set(-1.8 + i * 0.45, h / 2, -6.8);
        block.castShadow = true;
        diffuserGroup.add(block);
      }
      diffuserGroup.userData = { panelType: "diffuser", active: true };
      scene.add(diffuserGroup);
      panelGroups.push({ group: diffuserGroup, mat: woodMat });
      clickablePanels.push(diffuserGroup);

      // Foam bass traps in corners (triangular prisms)
      const bassTrapGroup = new THREE.Group();
      const foamMat = new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 0.95, metalness: 0 });
      const cornerPositions = [
        [-3.7, 0, -6.7],
        [3.7, 0, -6.7],
        [-3.7, 0, 2.7],
        [3.7, 0, 2.7],
      ];
      for (const [cx, cy, cz] of cornerPositions) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.6, 0);
        shape.lineTo(0, 0.6);
        shape.lineTo(0, 0);
        const extrudeSettings = { depth: 5, bevelEnabled: false };
        const prism = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrudeSettings), foamMat.clone());
        prism.position.set(cx, cy, cz);
        if (cx > 0) prism.rotation.y = Math.PI;
        prism.castShadow = true;
        bassTrapGroup.add(prism);
      }
      bassTrapGroup.userData = { panelType: "bassTrap", active: true };
      scene.add(bassTrapGroup);
      panelGroups.push({ group: bassTrapGroup, mat: foamMat });
      clickablePanels.push(bassTrapGroup);

      // Absorption panels on side walls
      const absorptionGroup = new THREE.Group();
      const fabricMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 1, metalness: 0 });
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 1.5), fabricMat.clone());
          panel.position.set(side * 3.95, 2, -5 + i * 2.5);
          panel.castShadow = true;
          absorptionGroup.add(panel);
        }
      }
      absorptionGroup.userData = { panelType: "absorption", active: true };
      scene.add(absorptionGroup);
      panelGroups.push({ group: absorptionGroup, mat: fabricMat });
      clickablePanels.push(absorptionGroup);

      // Glow halos around panel groups
      const glowHalos: ThreeAny[] = [];
      for (const pg of panelGroups) {
        const haloMat = new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        });
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), haloMat);
        halo.position.copy(pg.group.position || new THREE.Vector3(0, 2, -4));
        halo.visible = false;
        scene.add(halo);
        glowHalos.push(halo);
      }

      // Raycaster for panel click detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const allChildren: ThreeAny[] = [];
        for (const panel of clickablePanels) {
          panel.traverse((child: ThreeAny) => {
            if (child.isMesh) allChildren.push(child);
          });
        }

        const intersects = raycaster.intersectObjects(allChildren, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          let parentGroup: ThreeAny = hit;
          while (parentGroup.parent && !parentGroup.userData.panelType) {
            parentGroup = parentGroup.parent;
          }
          if (parentGroup.userData.panelType) {
            parentGroup.userData.active = !parentGroup.userData.active;
            parentGroup.visible = parentGroup.userData.active;
          }
        }
      };

      renderer.domElement.addEventListener("click", onClick);

      // Orbit controls (manual)
      let sphericalTheta = 0.3;
      let sphericalPhi = Math.PI / 3;
      let sphericalRadius = 10;
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

      const onMouseDown = (e: MouseEvent) => { isDragging = true; lastMX = e.clientX; lastMY = e.clientY; };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMX;
        const dy = e.clientY - lastMY;
        sphericalTheta -= dx * 0.005;
        sphericalPhi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, sphericalPhi - dy * 0.005));
        lastMX = e.clientX;
        lastMY = e.clientY;
        updateCamera();
      };
      const onMouseUp = () => { isDragging = false; };
      const onWheel = (e: WheelEvent) => {
        sphericalRadius = Math.max(4, Math.min(15, sphericalRadius + e.deltaY * 0.01));
        updateCamera();
      };

      renderer.domElement.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      renderer.domElement.addEventListener("wheel", onWheel);

      // Touch support
      let lastTouchDist = 0;
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) { isDragging = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; }
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
      };
      const onTouchMove = (e: TouchEvent) => {
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
      };
      const onTouchEnd = () => { isDragging = false; };

      renderer.domElement.addEventListener("touchstart", onTouchStart);
      renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
      renderer.domElement.addEventListener("touchend", onTouchEnd);

      // Animation loop
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Sound wave expansion
        for (const wave of soundWaves) {
          const phase = wave.userData.phase + time * 0.001;
          const progress = ((phase % (Math.PI * 2)) / (Math.PI * 2));
          const radius = progress * wave.userData.maxRadius;
          const opacity = Math.max(0, 0.6 * (1 - progress));
          wave.scale.set(radius, radius, 1);
          wave.material.opacity = opacity;
        }

        // Panel glow pulse for active groups
        for (let i = 0; i < panelGroups.length; i++) {
          const pg = panelGroups[i];
          const isActive = pg.group.userData.active;
          const halo = glowHalos[i];
          if (isActive) {
            halo.visible = true;
            halo.material.opacity = 0.1 + Math.sin(time * 0.002 + i) * 0.05;
            halo.position.set(
              pg.group.position?.x ?? 0,
              2.5,
              (pg.group.position?.z ?? -4) + 0.3
            );
          } else {
            halo.visible = false;
          }
        }

        // Room material reflectivity toggle
        for (const child of scene.children) {
          if (child.material && child.material.roughness !== undefined && child.material.metalness !== undefined) {
            const isRoomShell = child.material === floor.material ||
              child.material === backWall.material ||
              child.material === leftWall.material ||
              child.material === rightWall.material ||
              child.material === ceiling.material;
            if (isRoomShell) {
              const isTreated = treatedRef.current;
              child.material.roughness = isTreated ? 0.6 : 0.15;
              child.material.metalness = isTreated ? 0.3 : 0.85;
            }
          }
        }

        // Pulsing accent light
        accentLight.intensity = 3 + Math.sin(time * 0.003) * 0.5;

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
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("click", onClick);
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("wheel", onWheel);
        renderer.domElement.removeEventListener("touchstart", onTouchStart);
        renderer.domElement.removeEventListener("touchmove", onTouchMove);
        renderer.domElement.removeEventListener("touchend", onTouchEnd);
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
          <Text className="text-white font-bold text-base">ACOUSTICS LAB</Text>
        </View>
        <Pressable
          onPress={() => setTreated(t => !t)}
          className="px-3 py-1.5 rounded-lg active:opacity-70"
          style={{ backgroundColor: treated ? ACCENT_HEX : "#333" }}
        >
          <Text style={{ color: treated ? "#000" : "#aaa", fontWeight: "bold", fontSize: 11 }}>
            {treated ? "TREATED" : "BARE"}
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 relative bg-black">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ position: "absolute", inset: 0 }} />
        {!threeLoaded && !loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-5xl mb-3">🔊</Text>
            <Text className="text-white font-bold text-lg">Loading Acoustics Lab...</Text>
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
              <Text className="text-gray-300 text-xs">🎮 Drag to orbit • Scroll to zoom • Click panels to toggle</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
