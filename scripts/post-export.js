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

console.log('Post-export assets copied successfully!');
