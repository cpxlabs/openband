const fs = require('fs');
const path = require('path');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

fs.copyFileSync('assets/sw.js', 'dist/sw.js');
fs.copyFileSync('assets/manifest.json', 'dist/manifest.json');

fs.mkdirSync('dist/assets', { recursive: true });

const icons = ['icon-192.png', 'icon-512.png', 'favicon.png'];
icons.forEach(f => {
  fs.copyFileSync(path.join('assets', f), path.join('dist/assets', f));
});

const wasmSource = path.join('wasm', 'dist', 'openband-plugin.wasm');
const wasmAsset = path.join('assets', 'openband-plugin.wasm');
const wasmTargets = [wasmSource, wasmAsset].filter(f => fs.existsSync(f));
if (wasmTargets.length) {
  fs.copyFileSync(wasmTargets[0], path.join('dist/assets', 'openband-plugin.wasm'));
  console.log('Copied openband-plugin.wasm into dist/assets');
} else {
  console.log('No openband-plugin.wasm found to copy (run `npm run build:wasm` first)');
}

console.log('Post-export assets copied successfully!');
