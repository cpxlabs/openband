import fs from 'fs';
import path from 'path';

const appDir = path.join(process.cwd(), 'app');
const files = fs.readdirSync(appDir).filter(f => f.endsWith('.tsx'));

let polishedCount = 0;

for (const file of files) {
  const filePath = path.join(appDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // 1. Upgrade Renderer
  const badRenderer = 'const renderer = new THREE.WebGLRenderer({ antialias: false });';
  if (content.includes(badRenderer)) {
    content = content.replace(
      badRenderer,
      'const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });'
    );
    modified = true;
  }

  // 2. Ensure Shadows are enabled
  if (content.includes('new THREE.WebGLRenderer') && !content.includes('renderer.shadowMap.enabled')) {
    // Insert shadow map config after renderer pixel ratio
    content = content.replace(
      /(renderer\.setPixelRatio\(.*?\);)/,
      '$1\n      renderer.shadowMap.enabled = true;\n      renderer.shadowMap.type = THREE.PCFSoftShadowMap;'
    );
    modified = true;
  }

  // 3. Ensure ACESFilmicToneMapping is used
  if (content.includes('new THREE.WebGLRenderer') && !content.includes('renderer.toneMapping')) {
    content = content.replace(
      /(renderer\.setPixelRatio\(.*?\);)/,
      '$1\n      renderer.toneMapping = THREE.ACESFilmicToneMapping;\n      renderer.toneMappingExposure = 1.0;'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✨ Polished renderer settings in ${file}`);
    polishedCount++;
  }
}

if (polishedCount > 0) {
  console.log(`\nSuccessfully polished ${polishedCount} 3D studio screens!`);
} else {
  console.log(`\nAll 3D studio screens are already fully polished!`);
}
