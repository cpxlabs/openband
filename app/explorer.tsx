import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function ExplorerScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">MISSÃO</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-[#4a4440]">
        <iframe
          srcDoc={MISSION_HTML}
          title="MISSÃO"
          className="w-full h-full border-0"
        />
      </View>
    </View>
  );
}

const MISSION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MISSÃO</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #4a4440; }
  canvas { display: block; }
  #ui {
    position: absolute;
    bottom: 6%;
    right: 5%;
    color: #ffffff;
    font-family: "Arial Black", "Helvetica Neue", Arial, sans-serif;
    font-weight: 900;
    font-size: 7vw;
    letter-spacing: -0.03em;
    line-height: 1;
    pointer-events: none;
    text-shadow: 0 2px 10px rgba(0,0,0,0.35);
    user-select: none;
  }
  #vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%);
  }
</style>
</head>
<body>
<div id="vignette"></div>
<div id="ui">MISSÃO</div>

<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  } }
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BG = 0x4a4440;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 9, 22);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(4.8, 4.2, 6.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = false;
controls.minDistance = 4;
controls.maxDistance = 20;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
const wireMatFaint = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });

function wireMesh(geometry, mat = wireMat) {
  const wf = new THREE.WireframeGeometry(geometry);
  const mesh = new THREE.LineSegments(wf, mat);
  geometry.dispose();
  return mesh;
}

const grid = new THREE.GridHelper(40, 40, 0xffffff, 0xffffff);
grid.material.transparent = true;
grid.material.opacity = 0.14;
scene.add(grid);

const trapGroup = new THREE.Group();
scene.add(trapGroup);

const shadowGeo = new THREE.CircleGeometry(4.2, 48);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });
const shadow = new THREE.Mesh(shadowGeo, shadowMat);
shadow.rotation.x = -Math.PI / 2;
shadow.scale.set(1.08, 0.72, 1);
shadow.position.y = -0.01;
scene.add(shadow);

function ellipsePath(path, rx, rz, segments) {
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * rz;
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
}
const ringShape = new THREE.Shape();
ellipsePath(ringShape, 3.75, 2.45, 40);
const ringHole = new THREE.Path();
ellipsePath(ringHole, 2.55, 1.65, 40);
ringShape.holes.push(ringHole);
const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: 0.28, bevelEnabled: false, curveSegments: 40 });
ringGeo.rotateX(Math.PI / 2);
ringGeo.translate(0, -0.02, 0);
const ring = wireMesh(ringGeo);
trapGroup.add(ring);

const innerRimShape = new THREE.Shape();
ellipsePath(innerRimShape, 2.7, 1.75, 40);
const innerRimHole = new THREE.Path();
ellipsePath(innerRimHole, 2.55, 1.65, 40);
innerRimShape.holes.push(innerRimHole);
const innerRimGeo = new THREE.ExtrudeGeometry(innerRimShape, { depth: 0.04, bevelEnabled: false, curveSegments: 40 });
innerRimGeo.rotateX(Math.PI / 2);
const innerRing = wireMesh(innerRimGeo, wireMatFaint);
innerRing.position.y = 0.29;
trapGroup.add(innerRing);

const TEETH_COUNT = 20;
const RX = 3.15, RZ = 2.05;
for (let i = 0; i < TEETH_COUNT; i++) {
  const t = (i / TEETH_COUNT) * Math.PI * 2;
  const x = Math.cos(t) * RX;
  const z = Math.sin(t) * RZ;

  const toothGeo = new THREE.ConeGeometry(0.2, 1.3, 3, 2);
  const tooth = wireMesh(toothGeo);
  tooth.position.set(x, 0.1, z);

  const nx = Math.cos(t) / RX;
  const nz = Math.sin(t) / RZ;
  const outward = new THREE.Vector3(nx, 0, nz).normalize();
  const dir = new THREE.Vector3(outward.x * 0.4, 1, outward.z * 0.4).normalize();
  tooth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  trapGroup.add(tooth);
}

function makeBar(start, end, radius, mat) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, length, 6, 1);
  const bar = wireMesh(geo, mat);
  bar.position.copy(start).addScaledVector(dir, 0.5);
  bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return bar;
}
const haspPoint = new THREE.Vector3(3.65, 0.35, -1.35);
const bar1 = makeBar(new THREE.Vector3(-3.3, 0.12, 0.95), haspPoint, 0.09, wireMat);
trapGroup.add(bar1);
const bar2 = makeBar(new THREE.Vector3(-3.0, 0.12, -1.15), new THREE.Vector3(4.35, 0.85, -1.6), 0.075, wireMatFaint);
trapGroup.add(bar2);

const panGeo = new THREE.SphereGeometry(1.65, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2);
const pan = wireMesh(panGeo);
pan.scale.set(1, 0.09, 0.68);
pan.rotation.y = 0.42;
pan.position.set(0.1, 0.3, -0.05);
trapGroup.add(pan);

const haspGeo = new THREE.TorusGeometry(0.26, 0.055, 8, 24);
const hasp = wireMesh(haspGeo);
hasp.position.copy(haspPoint);
hasp.rotation.y = 0.5;
trapGroup.add(hasp);

const chainCurve = new THREE.CatmullRomCurve3([
  haspPoint.clone(),
  new THREE.Vector3(4.1, 0.9, -2.0),
  new THREE.Vector3(5.3, 2.0, -2.8),
  new THREE.Vector3(6.1, 3.1, -3.6),
  new THREE.Vector3(7.2, 4.4, -4.5),
  new THREE.Vector3(8.5, 5.8, -5.2),
  new THREE.Vector3(10.0, 7.2, -5.6),
]);
const LINKS = 20;
const frames = chainCurve.computeFrenetFrames(LINKS, false);
for (let i = 0; i <= LINKS; i++) {
  const t = i / LINKS;
  const pos = chainCurve.getPointAt(t);
  const tangent = frames.tangents[i];
  const normal = frames.normals[i];
  const binormal = frames.binormals[i];

  const basis = (i % 2 === 0)
    ? new THREE.Matrix4().makeBasis(tangent, binormal, normal)
    : new THREE.Matrix4().makeBasis(tangent, normal, binormal);
  const quat = new THREE.Quaternion().setFromRotationMatrix(basis);

  const linkGeo = new THREE.TorusGeometry(0.22, 0.06, 8, 16);
  const link = wireMesh(linkGeo);
  link.position.copy(pos);
  link.quaternion.copy(quat);
  link.scale.set(1.5, 1, 1);
  scene.add(link);
}

function addPill(x, y, z, rx, rz, scale = 1) {
  const geo = new THREE.CapsuleGeometry(0.075 * scale, 0.32 * scale, 4, 8);
  const pill = wireMesh(geo, wireMatFaint);
  pill.position.set(x, y, z);
  pill.rotation.set(rx, Math.random() * Math.PI, rz);
  scene.add(pill);
}
const pillSpots = [
  [-4.2, 0.08, 3.2, 1.3, 0.2],
  [-3.6, 0.08, 3.7, 1.1, -0.3, 0.85],
  [4.8, 0.08, -1.2, 1.2, 0.1, 0.8],
];
pillSpots.forEach(p => addPill(...p));

function addDots(cx, cz, count, spread) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(
      cx + (Math.random() - 0.5) * spread,
      0.04,
      cz + (Math.random() - 0.5) * spread
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.85 });
  scene.add(new THREE.Points(geo, mat));
}
addDots(4.3, -2.2, 10, 1.3);

function addCoil(x, z, radius, arc) {
  const geo = new THREE.TorusGeometry(radius, 0.028, 6, 48, arc);
  const coil = wireMesh(geo, wireMatFaint);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(x, 0.02, z);
  coil.rotation.z = Math.random() * Math.PI;
  scene.add(coil);
}
addCoil(-5.4, 4.4, 1.3, Math.PI * 1.6);
addCoil(-5.7, 4.7, 0.95, Math.PI * 1.7);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
</script>
</body>
</html>`;