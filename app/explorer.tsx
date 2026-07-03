import { useRef, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";

export default function ExplorerScreen() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState("");
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (tokenInput.trim().length > 20) {
      setToken(tokenInput.trim());
      setIframeError(null);
      setIframeReady(false);
    } else {
      setIframeError("Enter a valid Cesium Ion access token");
    }
  };

  const srcDoc = token ? buildGlobeHtml(token) : "";

  if (!token) {
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
            <Text className="text-white font-bold text-base">Explorer</Text>
          </View>
          <View className="w-9" />
        </View>

        <View className="flex-1 items-center justify-center bg-dark-bg px-8">
          <Text className="text-6xl mb-4">🌍</Text>
          <Text className="text-white font-bold text-lg mb-2">3D Globe Explorer</Text>
          <Text className="text-gray-400 text-center text-sm mb-6">
            Requires a free Cesium Ion access token for Google Photorealistic 3D Tiles.
          </Text>
          <Text className="text-gray-500 text-xs mb-2">
            Get one at ion.cesium.com → My Access Tokens
          </Text>
          <TextInput
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="Enter your Cesium Ion access token"
            placeholderTextColor="#555"
            className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-white text-sm mb-3"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
          />
          {iframeError && (
            <Text className="text-red-400 text-xs mb-3">{iframeError}</Text>
          )}
          <Pressable
            onPress={handleSubmit}
            className="bg-brand-primary rounded-xl px-8 py-3 active:opacity-80"
          >
            <Text className="text-white font-bold text-sm">Load Globe</Text>
          </Pressable>
          <Text className="text-gray-600 text-[10px] mt-4 text-center">
            Your token is only used locally in the iframe and is never stored or sent to our servers.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => {
            setToken("");
            setTokenInput("");
            setIframeReady(false);
          }}
          className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">Explorer</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <iframe
          ref={iframeRef as React.RefObject<HTMLIFrameElement>}
          srcDoc={srcDoc}
          title="3D Globe Explorer"
          className="w-full h-full border-0"
          onLoad={() => setIframeReady(true)}
          onError={() => setIframeError("Failed to load globe iframe")}
          style={{ display: iframeReady ? "block" : "none" }}
        />

        {!iframeReady && !iframeError && (
          <View className="absolute inset-0 items-center justify-center bg-black">
            <Text className="text-6xl mb-4">🌍</Text>
            <Text className="text-white font-bold text-lg">Loading 3D Globe...</Text>
            <Text className="text-gray-500 text-xs mt-2">
              Powered by three.js + Google Photorealistic Tiles
            </Text>
          </View>
        )}

        {iframeError && (
          <View className="absolute inset-0 items-center justify-center bg-black px-6">
            <Text className="text-4xl mb-3">🌍</Text>
            <Text className="text-white font-bold text-lg mb-2">Globe Unavailable</Text>
            <Text className="text-gray-400 text-center text-sm mb-4">{iframeError}</Text>
            <Pressable
              onPress={() => {
                setToken("");
                setTokenInput("");
                setIframeReady(false);
                setIframeError(null);
              }}
              className="bg-brand-primary rounded-xl px-6 py-3 active:opacity-80"
            >
              <Text className="text-white font-bold text-sm">Change Token</Text>
            </Pressable>
          </View>
        )}

        {iframeReady && !iframeError && (
          <View className="absolute bottom-6 left-4">
            <View className="bg-dark-surface/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <Text className="text-gray-300 text-xs">
                🌍 Google Photorealistic 3D Tiles
              </Text>
              <Text className="text-gray-500 text-[10px]">
                three.js + Cesium Ion
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function buildGlobeHtml(ionToken: string) {
  return [
    "<!DOCTYPE html>",
    "<html lang='en'>",
    "<head>",
    "<meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width,user-scalable=no,minimum-scale=1.0,maximum-scale=1.0'>",
    "<style>",
    "*{margin:0;padding:0;box-sizing:border-box}",
    "body{background:#000;overflow:hidden;font-family:system-ui,sans-serif}",
    "canvas{display:block;width:100vw;height:100vh}",
    "#info{position:absolute;top:10px;left:10px;z-index:10;color:#eee;font-size:12px;line-height:1.6;background:rgba(0,0,0,0.6);padding:8px 12px;border-radius:8px;pointer-events:none}",
    "#info a{color:#b3e5fc;pointer-events:auto}",
    "#loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#eee;z-index:20;transition:opacity 0.5s}",
    "#loading.hidden{opacity:0;pointer-events:none}",
    "#error{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#eee;z-index:20;padding:20px;text-align:center}",
    ".spinner{width:40px;height:40px;border:3px solid #333;border-top-color:#b3e5fc;border-radius:50%;animation:spin 1s linear infinite}",
    "@keyframes spin{to{transform:rotate(360deg)}}",
    "</style>",
    "</head>",
    "<body>",
    "<div id='loading'><div class='spinner'></div><p style='margin-top:12px;font-size:14px'>Loading 3D Globe...</p></div>",
    "<div id='error'><p style='font-size:32px;margin-bottom:12px'>🌍</p><p style='font-size:16px;font-weight:bold;margin-bottom:8px'>Failed to load globe</p><p id='error-msg' style='font-size:12px;color:#888'></p></div>",
    "<div id='info'><a href='https://threejs.org' target='_blank' rel='noopener'>three.js</a> - <a href='https://github.com/NASA-AMMOS/3DTilesRendererJS' target='_blank' rel='noopener'>3d-tiles-renderer</a><br/><a href='https://developers.google.com/maps/documentation/tile/3d-tiles' target='_blank' rel='noopener'>Google Photorealistic Tiles</a></div>",
    "<script type='importmap'>{\"imports\":{\"three\":\"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js\",\"three/addons/\":\"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/\",\"3d-tiles-renderer\":\"https://cdn.jsdelivr.net/npm/3d-tiles-renderer@0.4.27/build/index.js\",\"3d-tiles-renderer/core/plugins\":\"https://cdn.jsdelivr.net/npm/3d-tiles-renderer@0.4.27/build/index.core-plugins.js\",\"3d-tiles-renderer/three/plugins\":\"https://cdn.jsdelivr.net/npm/3d-tiles-renderer@0.4.27/build/index.three-plugins.js\"}}</script>",
    "<script type='module'>",
    "import * as THREE from 'three';",
    "import{DRACOLoader}from'three/addons/loaders/DRACOLoader.js';",
    "import{TilesRenderer,GlobeControls,CAMERA_FRAME}from'3d-tiles-renderer';",
    "import{CesiumIonAuthPlugin}from'3d-tiles-renderer/core/plugins';",
    "import{GLTFExtensionsPlugin,TilesFadePlugin,UpdateOnChangePlugin}from'3d-tiles-renderer/three/plugins';",
    "const ION_KEY='" + ionToken + "';",
    "let camera,scene,renderer,tiles,controls;",
    "function showError(m){document.getElementById('loading').style.display='none';document.getElementById('error').style.display='flex';document.getElementById('error-msg').textContent=m}",
    "async function init(){",
    "try{",
    "camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,10,1e6);",
    "scene=new THREE.Scene();",
    "renderer=new THREE.WebGLRenderer({antialias:true});",
    "renderer.setPixelRatio(devicePixelRatio);",
    "renderer.setSize(innerWidth,innerHeight);",
    "renderer.toneMapping=THREE.AgXToneMapping;",
    "renderer.toneMappingExposure=1.0;",
    "document.body.appendChild(renderer.domElement);",
    "const dl=new DRACOLoader();",
    "dl.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');",
    "const D=Math.PI/180;",
    "tiles=new TilesRenderer();",
    "tiles.registerPlugin(new CesiumIonAuthPlugin({apiToken:ION_KEY,assetId:2275207,autoRefreshToken:true}));",
    "tiles.registerPlugin(new GLTFExtensionsPlugin({dracoLoader:dl}));",
    "tiles.registerPlugin(new TilesFadePlugin());",
    "tiles.registerPlugin(new UpdateOnChangePlugin());",
    "tiles.setCamera(camera);",
    "tiles.setResolutionFromRenderer(camera,renderer);",
    "scene.add(tiles.group);",
    "tiles.ellipsoid.getObjectFrame(35.6812*D,139.80*D,500,-90*D,-10*D,0,camera.matrix,CAMERA_FRAME);",
    "camera.matrix.decompose(camera.position,camera.quaternion,camera.scale);",
    "controls=new GlobeControls(scene,camera,renderer.domElement);",
    "controls.setEllipsoid(tiles.ellipsoid,tiles.group);",
    "controls.enableDamping=true;",
    "controls.adjustHeight=false;",
    "renderer.domElement.addEventListener('pointerdown',()=>{controls.adjustHeight=true});",
    "renderer.domElement.addEventListener('wheel',()=>{controls.adjustHeight=true});",
    "const ld=document.getElementById('loading');if(ld)ld.classList.add('hidden');",
    "parent.postMessage({type:'globe-ready'},'*');",
    "animate();",
    "}catch(e){console.error(e);showError(e.message&&e.message.includes('403')?'Invalid or expired Cesium Ion token. Get one at ion.cesium.com':e.message||'Failed to initialize 3D globe')}",
    "}",
    "function animate(){requestAnimationFrame(animate);controls.update();tiles.update();renderer.render(scene,camera)}",
    "addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);tiles.setResolutionFromRenderer(camera,renderer)});",
    "init();",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}
