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
          <Text className="text-white font-bold text-base">MISSÃO 3D</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <iframe
          srcDoc={MISSION_HTML}
          title="3D Mission Interactive"
          className="w-full h-full border-0"
          style={{ background: "#333" }}
        />
      </View>
    </View>
  );
}

const MISSION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
    <title>3D Mission Interactive</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #333; }
        #ui { position: absolute; bottom: 20px; width: 100%; text-align: center; color: white; font-family: sans-serif; pointer-events: none; }
        p { font-size: 14px; opacity: 0.7; }
    </style>
</head>
<body>
    <div id="ui">
        <p>Click the center plate to trigger the trap</p>
    </div>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
        }
    }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { FontLoader } from 'three/addons/loaders/FontLoader.js';
        import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1, 0);
        controls.update();

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const ambient = new THREE.AmbientLight(0x404060);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5);
        fillLight.position.set(-5, 0, 5);
        scene.add(fillLight);

        const trapGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x88aaff, roughness: 0.3, metalness: 0.7, wireframe: false });

        const plate = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 3), mat);
        plate.name = "trigger";
        plate.position.y = -0.8;
        trapGroup.add(plate);

        const jawMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, roughness: 0.3, metalness: 0.7, wireframe: false });

        const jaw1 = new THREE.Mesh(new THREE.TorusGeometry(3, 0.15, 12, 24, Math.PI), jawMat);
        jaw1.position.y = -0.8;
        jaw1.rotation.z = Math.PI / 2;
        trapGroup.add(jaw1);

        const jaw2 = new THREE.Mesh(new THREE.TorusGeometry(3, 0.15, 12, 24, Math.PI), jawMat);
        jaw2.position.y = -0.8;
        jaw2.rotation.z = -Math.PI / 2;
        trapGroup.add(jaw2);

        scene.add(trapGroup);

        const loader = new FontLoader();
        loader.load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
            const geo = new TextGeometry('MISSÃO', {
                font,
                size: 0.8,
                height: 0.15,
                curveSegments: 8,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelSegments: 4,
            });
            geo.computeBoundingBox();
            const cx = (geo.boundingBox.max.x + geo.boundingBox.min.x) / 2;
            const cz = (geo.boundingBox.max.z + geo.boundingBox.min.z) / 2;

            const textMat = new THREE.MeshStandardMaterial({ color: 0xff4466, roughness: 0.2, metalness: 0.9, wireframe: false });
            const textMesh = new THREE.Mesh(geo, textMat);
            textMesh.position.set(-cx, 1.5, -cz);
            scene.add(textMesh);
        });

        camera.position.set(5, 3, 6);

        let triggered = false;
        window.addEventListener('click', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(plate);

            if (intersects.length > 0 && !triggered) {
                triggered = true;
                const animateTrap = () => {
                    jaw1.rotation.x += 0.08;
                    jaw2.rotation.x -= 0.08;
                    if (jaw1.rotation.x < 1.5) requestAnimationFrame(animateTrap);
                };
                animateTrap();
            }
        });

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>`;
