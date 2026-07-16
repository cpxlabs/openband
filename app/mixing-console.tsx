import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";
import LightControls from "../src/components/LightControls";
import { Screen3DFallback } from "../src/components";
import { loadThree } from "../src/lib/loadThree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;

const ACCENT = 0x00e5ff;
const ACCENT_HEX = "#00e5ff";
const DESK_COLOR = 0x1a1a2e;
const FADER_TRACK = 0x2d2d44;
const FADER_CAP = 0x404060;
const EQ_LOW = 0x3b82f6;
const EQ_MID = 0x22c55e;
const EQ_HIGH = 0xf97316;
const MONITOR_BEZEL = 0x111111;
const VU_GROUP_DEFS = [
  { label: "DRUMS", color: 0xff6482 },
  { label: "BASS", color: 0x5ac8fa },
  { label: "KEYS", color: 0xffcc00 },
  { label: "VOICE", color: 0x00e5ff },
];
const CHANNEL_WIDTH = 0.55;
const CHANNEL_GAP = 0.05;
const CHANNEL_COUNT = 16;
const DESK_DEPTH = 2.8;
const DESK_WIDTH = CHANNEL_COUNT * (CHANNEL_WIDTH + CHANNEL_GAP) + 0.6;
const CAMERA_POS = { x: 0, y: 4.5, z: 6 };
const LOOK_AT = { x: 0, y: 1.2, z: -0.5 };
const ORBIT_SENSITIVITY = 0.005;
const ORBIT_MIN_POLAR = 0.3;
const ORBIT_MAX_POLAR = Math.PI / 2.2;

function makeCanvasTexture(THREE: ThreeAny, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): ThreeAny {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  return new THREE.CanvasTexture(canvas);
}

function makeVUTexture(THREE: ThreeAny, level: number): ThreeAny {
  return makeCanvasTexture(THREE, 64, 256, (ctx) => {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, 64, 256);
    const totalSegments = 20;
    const activeSegments = Math.floor(level * totalSegments);
    const segH = 256 / totalSegments;
    for (let i = 0; i < totalSegments; i++) {
      const y = 256 - (i + 1) * segH + 2;
      if (i < activeSegments) {
        ctx.fillStyle = i < 12 ? `rgb(34,197,94)` : i < 17 ? `rgb(234,179,8)` : `rgb(239,68,68)`;
      } else {
        ctx.fillStyle = "#1a1a1a";
      }
      ctx.fillRect(8, y, 48, segH - 4);
    }
  });
}

function makeScreenTexture(THREE: ThreeAny, width: number, height: number): ThreeAny {
  return makeCanvasTexture(THREE, width, height, (ctx) => {
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, width, height);

    // DAW timeline tracks
    const trackH = 28;
    const trackColors = [0x3b82f6, 0x22c55e, 0xf97316, 0xec4899, 0x8b5cf6, 0x06b6d4, 0xeab308, 0xef4444];
    const startY = 20;
    for (let t = 0; t < 8; t++) {
      const y = startY + t * (trackH + 6);
      ctx.fillStyle = "#111827";
      ctx.fillRect(10, y, width - 20, trackH);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, y, width - 20, trackH);

      const barCount = 3 + (t % 4);
      let bx = 14;
      for (let b = 0; b < barCount; b++) {
        const bw = 30 + ((t * 17 + b * 31) % 80);
        const color = trackColors[t % trackColors.length];
        ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
        ctx.globalAlpha = 0.7 + ((t + b) % 3) * 0.1;
        ctx.fillRect(bx, y + 3, bw, trackH - 6);
        bx += bw + 4;
      }
      ctx.globalAlpha = 1;
    }

    // Playhead
    ctx.fillStyle = ACCENT_HEX;
    ctx.fillRect(width * 0.38, 10, 2, height - 20);
    ctx.beginPath();
    ctx.moveTo(width * 0.38 - 6, 10);
    ctx.lineTo(width * 0.38 + 6, 10);
    ctx.lineTo(width * 0.38, 16);
    ctx.fill();

    // Timecode
    ctx.fillStyle = ACCENT_HEX;
    ctx.font = "bold 16px monospace";
    ctx.fillText("001:02:14:08", 10, height - 6);

    // Transport buttons
    ctx.fillStyle = "#374151";
    ctx.fillRect(width - 140, height - 30, 28, 22);
    ctx.fillRect(width - 106, height - 30, 28, 22);
    ctx.fillRect(width - 72, height - 30, 28, 22);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px sans-serif";
    ctx.fillText("⏮", width - 133, height - 14);
    ctx.fillText("▶", width - 99, height - 14);
    ctx.fillText("⏹", width - 65, height - 14);
  });
}

function createChannelStrip(THREE: ThreeAny, x: number, y: number, z: number, index: number): ThreeAny {
  const group = new THREE.Group();

  // Channel background panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(CHANNEL_WIDTH, 1.2, 0.08),
    new THREE.MeshStandardMaterial({ color: DESK_COLOR, roughness: 0.85, metalness: 0.15 })
  );
  panel.position.set(x, y + 0.6, z);
  group.add(panel);

  // Separator lines
  const sepGeo = new THREE.BoxGeometry(0.01, 1.2, 0.09);
  const sepMat = new THREE.MeshStandardMaterial({ color: 0x333355 });
  const sepLeft = new THREE.Mesh(sepGeo, sepMat);
  sepLeft.position.set(x - CHANNEL_WIDTH / 2 - CHANNEL_GAP / 2, y + 0.6, z);
  group.add(sepLeft);

  // EQ knobs (3 per channel: Low, Mid, High)
  const knobY = [y + 1.0, y + 0.82, y + 0.64];
  const knobColors = [EQ_LOW, EQ_MID, EQ_HIGH];
  for (let k = 0; k < 3; k++) {
    const knobGroup = new THREE.Group();
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: knobColors[k], roughness: 0.4, metalness: 0.6 })
    );
    const indicator = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.04, 0.035),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: knobColors[k], emissiveIntensity: 0.5 })
    );
    indicator.position.set(0, 0, 0.015);
    knobGroup.add(knob);
    knobGroup.add(indicator);
    knobGroup.position.set(x, knobY[k], z + 0.06);
    knobGroup.rotation.x = Math.PI / 2;
    knobGroup.rotation.z = ((index * 7 + k * 13) % 360) * (Math.PI / 180) * 0.5;
    group.add(knobGroup);
  }

  // Fader track
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.5, 0.02),
    new THREE.MeshStandardMaterial({ color: FADER_TRACK, roughness: 0.9 })
  );
  track.position.set(x, y + 0.28, z + 0.06);
  group.add(track);

  // Fader cap
  const faderLevel = 0.3 + ((index * 37) % 70) / 100;
  const capY = y + 0.05 + faderLevel * 0.45;
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.04, 0.05),
    new THREE.MeshStandardMaterial({ color: FADER_CAP, roughness: 0.5, metalness: 0.5 })
  );
  cap.position.set(x, capY, z + 0.065);
  group.add(cap);

  // Channel number label
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 64;
  labelCanvas.height = 32;
  const lctx = labelCanvas.getContext("2d")!;
  lctx.fillStyle = ACCENT_HEX;
  lctx.font = "bold 22px monospace";
  lctx.textAlign = "center";
  lctx.fillText(`${index + 1}`, 32, 24);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false });
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.position.set(x, y + 1.15, z + 0.05);
  labelSprite.scale.set(0.3, 0.15, 1);
  group.add(labelSprite);

  // Mute/solo buttons
  const btnGeo = new THREE.BoxGeometry(0.08, 0.04, 0.015);
  const muteMat = new THREE.MeshStandardMaterial({ color: index % 3 === 0 ? 0xef4444 : 0x374151, emissive: index % 3 === 0 ? 0xef4444 : 0x000000, emissiveIntensity: index % 3 === 0 ? 0.6 : 0 });
  const muteBtn = new THREE.Mesh(btnGeo, muteMat);
  muteBtn.position.set(x - 0.1, y + 0.48, z + 0.06);
  group.add(muteBtn);

  const soloMat = new THREE.MeshStandardMaterial({ color: index % 5 === 0 ? 0xeab308 : 0x374151, emissive: index % 5 === 0 ? 0xeab308 : 0x000000, emissiveIntensity: index % 5 === 0 ? 0.6 : 0 });
  const soloBtn = new THREE.Mesh(btnGeo, soloMat);
  soloBtn.position.set(x + 0.1, y + 0.48, z + 0.06);
  group.add(soloBtn);

  // Pan knob
  const panKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.7 })
  );
  const panInd = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.03, 0.025),
    new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.4 })
  );
  panInd.position.set(0, 0, 0.01);
  const panGroup = new THREE.Group();
  panGroup.add(panKnob);
  panGroup.add(panInd);
  panGroup.position.set(x, y + 0.55, z + 0.06);
  panGroup.rotation.x = Math.PI / 2;
  panGroup.rotation.z = ((index - 7.5) * 0.15);
  group.add(panGroup);

  return group;
}

function createMonitor(THREE: ThreeAny, x: number, y: number, z: number, rotationY: number): ThreeAny {
  const group = new THREE.Group();

  // Monitor stand
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.4 })
  );
  stand.position.set(x, y + 0.3, z);
  group.add(stand);

  // Monitor base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.4 })
  );
  base.position.set(x, y + 0.6, z);
  group.add(base);

  // Bezel
  const bezelW = 1.6;
  const bezelH = 1.0;
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(bezelW + 0.06, bezelH + 0.06, 0.04),
    new THREE.MeshStandardMaterial({ color: MONITOR_BEZEL, roughness: 0.7, metalness: 0.3 })
  );
  bezel.position.set(x, y + 0.6 + bezelH / 2 + 0.03, z);
  group.add(bezel);

  // Screen
  const screenTex = makeScreenTexture(THREE, 512, 320);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(bezelW, bezelH),
    new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.8 })
  );
  screen.position.set(x, y + 0.6 + bezelH / 2 + 0.03, z + 0.025);
  group.add(screen);

  group.rotation.y = rotationY;

  return group;
}

function createVUMeter(THREE: ThreeAny, x: number, y: number, z: number): ThreeAny {
  const group = new THREE.Group();

  // VU housing
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 1.0, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.2 })
  );
  housing.position.set(x, y + 0.5, z);
  group.add(housing);

  // VU glass
  const level = 0.55 + Math.random() * 0.35;
  const vuTex = makeVUTexture(THREE, level);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.9),
    new THREE.MeshStandardMaterial({ map: vuTex, emissive: 0xffffff, emissiveMap: vuTex, emissiveIntensity: 0.5 })
  );
  glass.position.set(x, y + 0.5, z + 0.035);
  group.add(glass);

  return group;
}

function createVUMeterGroup(
  THREE: ThreeAny,
  x: number,
  y: number,
  z: number,
  label: string,
  color: number,
): ThreeAny {
  const group = new THREE.Group();

  const meter = createVUMeter(THREE, x, y, z);
  group.add(meter);

  const baseBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.04, 0.08),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }),
  );
  baseBar.position.set(x, y + 0.02, z);
  group.add(baseBar);

  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 128;
  labelCanvas.height = 32;
  const lctx = labelCanvas.getContext("2d")!;
  lctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  lctx.font = "bold 20px sans-serif";
  lctx.textAlign = "center";
  lctx.fillText(label, 64, 24);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false }),
  );
  labelSprite.position.set(x, y + 1.05, z + 0.05);
  labelSprite.scale.set(0.6, 0.15, 1);
  group.add(labelSprite);

  return group;
}

export default function MixingConsole() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lightRef = useRef({ color: ACCENT, intensity: 1.5 });

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
        if (!cancelled) setLoadError("Three.js unavailable — 3D console disabled");
        return;
      }
      if (cancelled) return;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.Fog(0x0a0a0f, 8, 18);

      // Perspective Camera
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);
      camera.position.set(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z);
      camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x404060, 1.2));

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
      keyLight.position.set(3, 6, 4);
      scene.add(keyLight);

      const fillLight = new THREE.PointLight(ACCENT, 1.5, 18);
      fillLight.position.set(-4, 4, 2);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(0x3b82f6, 1.2, 15);
      rimLight.position.set(0, 3, -4);
      scene.add(rimLight);

      // Accent strip light along desk front edge
      const stripLight = new THREE.PointLight(ACCENT, 1.0, 12);
      stripLight.position.set(0, 0.5, 2);
      scene.add(stripLight);

      addSceneBulb(THREE, scene);
      const { stripMat, dotMat } = addRGBStrip(THREE, scene, { color: ACCENT });

      // Floor
      const floorGeo = new THREE.PlaneGeometry(20, 20);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f0f1a, roughness: 0.95, metalness: 0.05 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      scene.add(floor);

      // Floor grid
      scene.add(new THREE.GridHelper(20, 40, 0x1e293b, 0x0f172a));

      // ====== MIXING DESK ======
      const deskGroup = new THREE.Group();
      scene.add(deskGroup);

      // Desk base (lower body)
      const deskBase = new THREE.Mesh(
        new THREE.BoxGeometry(DESK_WIDTH, 0.7, DESK_DEPTH),
        new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9, metalness: 0.1 })
      );
      deskBase.position.set(0, 0.35, -0.5);
      deskGroup.add(deskBase);

      // Sloped desk surface (the angled top where controls sit)
      const slopeAngle = -0.2;
      const slopeH = 0.08;
      const slopeGeo = new THREE.BoxGeometry(DESK_WIDTH, slopeH, DESK_DEPTH * 0.85);
      const slopeMat = new THREE.MeshStandardMaterial({ color: DESK_COLOR, roughness: 0.75, metalness: 0.25 });
      const slope = new THREE.Mesh(slopeGeo, slopeMat);
      slope.position.set(0, 0.72, -0.3);
      slope.rotation.x = slopeAngle;
      deskGroup.add(slope);

      // Desk front edge accent strip
      const accentStrip = new THREE.Mesh(
        new THREE.BoxGeometry(DESK_WIDTH, 0.025, 0.02),
        new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.8 })
      );
      accentStrip.position.set(0, 0.7, 0.5);
      deskGroup.add(accentStrip);

      // Channel strips
      const channelGroup = new THREE.Group();
      const channelStartX = -(DESK_WIDTH / 2) + CHANNEL_WIDTH / 2 + 0.2;
      for (let i = 0; i < CHANNEL_COUNT; i++) {
        const cx = channelStartX + i * (CHANNEL_WIDTH + CHANNEL_GAP);
        const cz = -0.3;
        const strip = createChannelStrip(THREE, cx, 0.72, cz, i);
        strip.rotation.x = slopeAngle;
        channelGroup.add(strip);
      }
      deskGroup.add(channelGroup);

      // Master section (right side of desk)
      const masterSection = new THREE.Group();
      const masterX = channelStartX + CHANNEL_COUNT * (CHANNEL_WIDTH + CHANNEL_GAP) + 0.25;

      // Master faders (2)
      for (let m = 0; m < 2; m++) {
        const mTrack = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.55, 0.02),
          new THREE.MeshStandardMaterial({ color: FADER_TRACK, roughness: 0.9 })
        );
        mTrack.position.set(masterX + m * 0.2, 0.28, -0.25);
        masterSection.add(mTrack);

        const mCap = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.05, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.4, metalness: 0.6 })
        );
        mCap.position.set(masterX + m * 0.2, 0.35, -0.22);
        masterSection.add(mCap);
      }

      // Master label
      const masterLabelCanvas = document.createElement("canvas");
      masterLabelCanvas.width = 128;
      masterLabelCanvas.height = 32;
      const mctx = masterLabelCanvas.getContext("2d")!;
      mctx.fillStyle = ACCENT_HEX;
      mctx.font = "bold 18px sans-serif";
      mctx.textAlign = "center";
      mctx.fillText("MASTER", 64, 22);
      const masterTex = new THREE.CanvasTexture(masterLabelCanvas);
      const masterSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: masterTex, transparent: true, depthWrite: false }));
      masterSprite.position.set(masterX + 0.1, 0.75, -0.2);
      masterSprite.scale.set(0.6, 0.15, 1);
      masterSection.add(masterSprite);

      masterSection.rotation.x = slopeAngle;
      deskGroup.add(masterSection);

      // ====== VU METER GROUPS (above desk, centered, bus-colored) ======
      const vuY = 1.6;
      const vuZ = -1.4;
      const vuStartX = -((VU_GROUP_DEFS.length - 1) * 0.9) / 2;
      VU_GROUP_DEFS.forEach((def, v) => {
        const vx = vuStartX + v * 0.9;
        const vu = createVUMeterGroup(THREE, vx, vuY, vuZ, def.label, def.color);
        deskGroup.add(vu);
      });

      // ====== DAW MONITORS ======
      const monitorY = 0.7;
      const monitorZ = -1.8;
      const monitorLeft = createMonitor(THREE, -1.8, monitorY, monitorZ, 0.15);
      const monitorRight = createMonitor(THREE, 1.8, monitorY, monitorZ, -0.15);
      deskGroup.add(monitorLeft);
      deskGroup.add(monitorRight);

      // ====== RACK UNITS (behind monitors) ======
      for (let r = 0; r < 3; r++) {
        const rack = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.35, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.3 })
        );
        rack.position.set(-1.5 + r * 1.5, 2.0, -2.2);
        deskGroup.add(rack);

        // Rack indicator lights
        for (let l = 0; l < 4; l++) {
          const led = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 8, 8),
            new THREE.MeshStandardMaterial({
              color: [ACCENT, 0x22c55e, 0xeab308, 0xef4444][l],
              emissive: [ACCENT, 0x22c55e, 0xeab308, 0xef4444][l],
              emissiveIntensity: 0.8 + Math.sin(r + l) * 0.2,
            })
          );
          led.position.set(-1.6 + r * 1.5 + l * 0.08, 2.0, -2.05);
          deskGroup.add(led);
        }
      }

      // ====== BACK WALL ======
      const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 6),
        new THREE.MeshStandardMaterial({ color: 0x0f0f1a, roughness: 0.95 })
      );
      backWall.position.set(0, 3, -4);
      scene.add(backWall);

      // Acoustic panels on wall
      for (let p = 0; p < 5; p++) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 2, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.95 })
        );
        panel.position.set(-4.8 + p * 2.4, 3, -3.95);
        scene.add(panel);
      }

      // ====== CEILING LIGHT (subtle) ======
      const ceilingLight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x202030, emissive: 0x1a1a2e })
      );
      ceilingLight.position.set(0, 5.9, 0);
      scene.add(ceilingLight);

      // ====== ORBIT CONTROLS (manual mouse drag) ======
      let isDragging = false;
      let prevMouse = { x: 0, y: 0 };
      let spherical = { theta: 0, phi: Math.acos((CAMERA_POS.y - LOOK_AT.y) / CAMERA_POS.z) };
      let orbitRadius = Math.sqrt(
        (CAMERA_POS.x - LOOK_AT.x) ** 2 +
        (CAMERA_POS.y - LOOK_AT.y) ** 2 +
        (CAMERA_POS.z - LOOK_AT.z) ** 2
      );

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      };
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        spherical.theta -= dx * ORBIT_SENSITIVITY;
        spherical.phi = Math.max(ORBIT_MIN_POLAR, Math.min(ORBIT_MAX_POLAR, spherical.phi + dy * ORBIT_SENSITIVITY));
        camera.position.x = LOOK_AT.x + orbitRadius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.position.y = LOOK_AT.y + orbitRadius * Math.cos(spherical.phi);
        camera.position.z = LOOK_AT.z + orbitRadius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
        prevMouse = { x: e.clientX, y: e.clientY };
      };
      const handleMouseUp = () => { isDragging = false; };
      const handleWheel = (e: WheelEvent) => {
        orbitRadius = Math.max(3, Math.min(12, orbitRadius + e.deltaY * 0.005));
        camera.position.x = LOOK_AT.x + orbitRadius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.position.y = LOOK_AT.y + orbitRadius * Math.cos(spherical.phi);
        camera.position.z = LOOK_AT.z + orbitRadius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
      };

      renderer.domElement.addEventListener("mousedown", handleMouseDown);
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseup", handleMouseUp);
      renderer.domElement.addEventListener("mouseleave", handleMouseUp);
      renderer.domElement.addEventListener("wheel", handleWheel);

      // Animation loop
      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        // Subtle VU meter animation
        if (channelGroup.children.length > 0) {
          const t = time * 0.001;
          for (let c = 0; c < channelGroup.children.length; c++) {
            const strip = channelGroup.children[c] as ThreeAny;
            // Find fader cap and animate slightly
            if (strip.children) {
              for (const child of strip.children) {
                if ((child as ThreeAny).geometry && (child as ThreeAny).geometry.parameters) {
                  const p = (child as ThreeAny).geometry.parameters;
                  if (p.width === 0.1 && p.height === 0.04) {
                    const bob = Math.sin(t * 2 + c * 0.5) * 0.005;
                    child.position.y += bob;
                  }
                }
              }
            }
          }
        }

        const lc = lightRef.current;
        fillLight.color.setHex(lc.color);
        fillLight.intensity = lc.intensity;
        stripLight.color.setHex(lc.color);
        stripLight.intensity = lc.intensity * 0.6;
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

      return () => {
        cancelled = true;
        cancelAnimationFrame(animationId);
        renderer.domElement.removeEventListener("mousedown", handleMouseDown);
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseup", handleMouseUp);
        renderer.domElement.removeEventListener("mouseleave", handleMouseUp);
        renderer.domElement.removeEventListener("wheel", handleWheel);
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
    return <Screen3DFallback title="MIXING CONSOLE" icon="🎛️" />;
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
          <Text className="text-white font-bold text-base">MIXING CONSOLE</Text>
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
            <Text className="text-4xl mb-3">🎛</Text>
            <Text className="text-white font-bold text-lg">Loading Mixing Console...</Text>
          </View>
        )}

        {loadError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🎛</Text>
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
        <LightControls ref={lightRef} defaultColor={ACCENT} defaultIntensity={1.5} />
      </View>
    </View>
  );
}
