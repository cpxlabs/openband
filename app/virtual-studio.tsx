import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

// Collaboration service URL
const COLLAB_URL = process.env.EXPO_PUBLIC_COLLAB_URL || "ws://localhost:8001";

interface Avatar {
  id: string;
  name: string;
  x: number;
  z: number;
  color: string;
}

interface Furniture {
  id: string;
  name: string;
  icon: string;
  x: number;
  z: number;
  color: string;
  route: string;
  width: number;
  depth: number;
}

const FURNITURE: Furniture[] = [
  { id: "mixer", name: "Mixer", icon: "🎛", x: -3, z: -2, color: "#3b82f6", route: "/studio", width: 2, depth: 1 },
  { id: "mastering", name: "Mastering", icon: "🎚", x: 3, z: -2, color: "#8b5cf6", route: "/mastering", width: 2, depth: 1 },
  { id: "tracks", name: "Tracks", icon: "🎵", x: -3, z: 2, color: "#10b981", route: "/tabs/library", width: 2, depth: 1 },
  { id: "piano", name: "Piano Roll", icon: "🎹", x: 3, z: 2, color: "#f59e0b", route: "/studio", width: 2, depth: 1 },
  { id: "looper", name: "Looper", icon: "🔁", x: 0, z: -3, color: "#ef4444", route: "/studio", width: 1.5, depth: 1 },
  { id: "sampler", name: "Sampler", icon: "🥁", x: 0, z: 3, color: "#06b6d4", route: "/studio", width: 1.5, depth: 1 },
];

const AVATAR_COLORS = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#a29bfe", "#fd79a8"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function VirtualStudio() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sceneRef = useRef<any>(null);
  const [connectedUsers, setConnectedUsers] = useState(1);
  const [userId] = useState(() => `user-${Math.random().toString(36).slice(2, 8)}`);
  const [userName] = useState(() => `User${Math.floor(Math.random() * 999)}`);
  const myPosRef = useRef({ x: 0, z: 0 });

  // Connect to collaboration WebSocket
  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${COLLAB_URL}/ws/project/studio-room`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          type: "join",
          userId,
          userName,
          x: 0,
          z: 0,
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "state_change" && msg.data?.avatars) {
            const avatarsArr = Object.values(msg.data.avatars) as Avatar[];
            const others = avatarsArr.filter((a) => a.id !== userId);
            setConnectedUsers(others.length + 1);
          }
        } catch {}
      };

      ws.onerror = () => {
        // WebSocket not available — run in local mode
      };
    } catch {
      // WebSocket not available
    }

    return () => {
      ws?.close();
    };
  }, [userId, userName]);

  // Broadcast position on movement
  const broadcastPosition = useCallback((x: number, z: number) => {
    myPosRef.current = { x, z };
    wsRef.current?.send(JSON.stringify({
      type: "movement",
      userId,
      x,
      z,
    }));
  }, [userId]);

  // Initialize Three.js scene
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let cancelled = false;
    let animationId = 0;

    async function init() {
      // Load three.js dynamically from CDN if not available
      let THREE: any;
      if (typeof window !== "undefined" && (window as any).THREE) {
        THREE = (window as any).THREE;
      } else {
        // @ts-ignore — three.js may not be installed, loaded dynamically
        THREE = await import("three");
      }
      if (cancelled) return;

      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.Fog(0x0a0a0f, 20, 40);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
      camera.position.set(0, 12, 12);
      camera.lookAt(0, 0, 0);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1);
      mainLight.position.set(5, 10, 5);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.set(2048, 2048);
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -15;
      mainLight.shadow.camera.right = 15;
      mainLight.shadow.camera.top = 15;
      mainLight.shadow.camera.bottom = -15;
      scene.add(mainLight);

      const fillLight = new THREE.PointLight(0x3b82f6, 0.3, 20);
      fillLight.position.set(-5, 5, -5);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(0x8b5cf6, 0.3, 20);
      rimLight.position.set(5, 5, 5);
      scene.add(rimLight);

      // Floor
      const floorGeo = new THREE.PlaneGeometry(20, 20);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.8,
        metalness: 0.2,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Grid on floor
      const gridHelper = new THREE.GridHelper(20, 20, 0x2a2a4e, 0x1a1a2e);
      scene.add(gridHelper);

      // Walls
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x16162a,
        roughness: 0.9,
        transparent: true,
        opacity: 0.7,
      });

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
      backWall.position.set(0, 4, -10);
      scene.add(backWall);

      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
      leftWall.position.set(-10, 4, 0);
      leftWall.rotation.y = Math.PI / 2;
      scene.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
      rightWall.position.set(10, 4, 0);
      rightWall.rotation.y = -Math.PI / 2;
      scene.add(rightWall);

      // Furniture
      const furnitureMeshes: any[] = [];
      const furnitureGroup = new THREE.Group();
      scene.add(furnitureGroup);

      for (const f of FURNITURE) {
        const group = new THREE.Group();
        group.position.set(f.x, 0, f.z);
        group.userData = { furnitureId: f.id, route: f.route };

        // Base
        const baseGeo = new THREE.BoxGeometry(f.width, 0.8, f.depth);
        const baseMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(f.color),
          roughness: 0.4,
          metalness: 0.6,
          emissive: new THREE.Color(f.color),
          emissiveIntensity: 0.15,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.4;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Top surface
        const topGeo = new THREE.BoxGeometry(f.width - 0.1, 0.05, f.depth - 0.1);
        const topMat = new THREE.MeshStandardMaterial({
          color: 0x222233,
          roughness: 0.2,
          metalness: 0.8,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 0.82;
        group.add(top);

        // Icon label (floating text plane)
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "transparent";
        ctx.fillRect(0, 0, 128, 64);
        ctx.font = "32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.icon, 64, 36);
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(f.name, 64, 56);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(1.5, 0.75);
        const labelMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.y = 1.5;
        group.add(label);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(f.width / 2 + 0.1, f.width / 2 + 0.15, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(f.color),
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        furnitureGroup.add(group);
        furnitureMeshes.push(base);
      }

      // My avatar
      const myColor = AVATAR_COLORS[hashStr(userId) % AVATAR_COLORS.length];
      const avatarGroup = new THREE.Group();
      scene.add(avatarGroup);

      // Body
      const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(myColor),
        roughness: 0.3,
        metalness: 0.5,
        emissive: new THREE.Color(myColor),
        emissiveIntensity: 0.2,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      body.castShadow = true;
      avatarGroup.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(myColor),
        roughness: 0.3,
        metalness: 0.5,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.3;
      head.castShadow = true;
      avatarGroup.add(head);

      // Name tag
      const nameCanvas = document.createElement("canvas");
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nameCtx = nameCanvas.getContext("2d")!;
      nameCtx.font = "bold 28px sans-serif";
      nameCtx.textAlign = "center";
      nameCtx.fillStyle = "#ffffff";
      nameCtx.fillText(userName, 128, 40);

      const nameTexture = new THREE.CanvasTexture(nameCanvas);
      const nameGeo = new THREE.PlaneGeometry(2, 0.5);
      const nameMat = new THREE.MeshBasicMaterial({
        map: nameTexture,
        transparent: true,
        depthWrite: false,
      });
      const nameLabel = new THREE.Mesh(nameGeo, nameMat);
      nameLabel.position.y = 1.8;
      avatarGroup.add(nameLabel);

      // Raycaster for interaction
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(furnitureMeshes, false);

        if (intersects.length > 0) {
          const parent = intersects[0].object.parent;
          const route = parent?.userData?.route;
          if (route) {
            router.push(route);
          }
        }
      };

      renderer.domElement.addEventListener("click", handleClick);

      // WASD movement
      const keys = new Set<string>();
      const handleKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
      const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      // Camera orbit with mouse drag
      let isDragging = false;
      let lastMouse = { x: 0, y: 0 };
      let cameraAngle = { theta: 0, phi: Math.PI / 4 };
      let cameraDistance = 17;

      renderer.domElement.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button === 2) {
          isDragging = true;
          lastMouse = { x: e.clientX, y: e.clientY };
        }
      });
      renderer.domElement.addEventListener("contextmenu", (e: Event) => e.preventDefault());
      window.addEventListener("mouseup", () => { isDragging = false; });
      window.addEventListener("mousemove", (e: MouseEvent) => {
        if (isDragging) {
          const dx = e.clientX - lastMouse.x;
          const dy = e.clientY - lastMouse.y;
          cameraAngle.theta -= dx * 0.005;
          cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi - dy * 0.005));
          lastMouse = { x: e.clientX, y: e.clientY };
        }
      });
      renderer.domElement.addEventListener("wheel", (e: WheelEvent) => {
        cameraDistance = Math.max(8, Math.min(30, cameraDistance + e.deltaY * 0.02));
      });

      // Animation loop
      let lastTime = performance.now();
      const moveSpeed = 8;

      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        // WASD movement
        let dx = 0, dz = 0;
        if (keys.has("w") || keys.has("arrowup")) dz -= 1;
        if (keys.has("s") || keys.has("arrowdown")) dz += 1;
        if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
        if (keys.has("d") || keys.has("arrowright")) dx += 1;

        if (dx !== 0 || dz !== 0) {
          const len = Math.sqrt(dx * dx + dz * dz);
          dx /= len;
          dz /= len;
          avatarGroup.position.x += dx * moveSpeed * delta;
          avatarGroup.position.z += dz * moveSpeed * delta;

          // Clamp to room bounds
          avatarGroup.position.x = Math.max(-8, Math.min(8, avatarGroup.position.x));
          avatarGroup.position.z = Math.max(-8, Math.min(8, avatarGroup.position.z));

          // Broadcast position
          broadcastPosition(avatarGroup.position.x, avatarGroup.position.z);
        }

        // Bob animation
        body.position.y = 0.7 + Math.sin(time * 0.003) * 0.05;
        head.position.y = 1.3 + Math.sin(time * 0.003) * 0.05;

        // Update camera orbit
        camera.position.x = avatarGroup.position.x + Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi) * cameraDistance;
        camera.position.z = avatarGroup.position.z + Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi) * cameraDistance;
        camera.position.y = Math.sin(cameraAngle.phi) * cameraDistance;
        camera.lookAt(avatarGroup.position.x, 0, avatarGroup.position.z);

        // Animate furniture glow
        furnitureGroup.children.forEach((group: any, i: number) => {
          const ring = group.children[3] as any;
          if (ring?.material) {
            (ring.material as any).opacity = 0.2 + Math.sin(time * 0.002 + i) * 0.15;
          }
        });

        renderer.render(scene, camera);
      }

      animate(performance.now());

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
        renderer.domElement.removeEventListener("click", handleClick);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("resize", handleResize);
        container.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }

    const cleanup = init();
    return () => { cleanup?.then((fn) => fn?.()); };
  }, [userId, userName, router, broadcastPosition]);

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
          <Text className="text-white font-bold text-base">Virtual Studio</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-green-500" />
          <Text className="text-green-400 text-xs">{connectedUsers} online</Text>
        </View>
      </View>

      {/* 3D Canvas */}
      <View className="flex-1 relative bg-black">
        <div
          ref={containerRef as any}
          style={{ position: "absolute", inset: 0 }}
        />

        {/* Controls overlay */}
        <View className="absolute bottom-6 left-4">
          <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <Text className="text-gray-300 text-xs">🎮 WASD to move • Right-click drag to orbit • Scroll to zoom</Text>
            <Text className="text-gray-500 text-[10px]">Click furniture to open tools</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
