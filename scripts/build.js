const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Starting Expo web export...');
  execSync('npx expo export --platform web --clear', { stdio: 'inherit' });

  console.log('Copying assets...');
  if (fs.existsSync('assets/sw.js')) {
    fs.copyFileSync('assets/sw.js', 'dist/sw.js');
  }
  if (fs.existsSync('assets/manifest.json')) {
    fs.copyFileSync('assets/manifest.json', 'dist/manifest.json');
  }
  
  fs.mkdirSync('dist/assets', { recursive: true });
  ['icon-192.png', 'icon-512.png', 'favicon.png'].forEach(f => {
    const srcPath = path.join('assets', f);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join('dist/assets', f));
    }
  });

  console.log('Copying dist to public...');
  fs.cpSync('dist', 'public', { recursive: true });

  console.log('Build completed successfully. Force exiting to prevent Metro CI hangs...');
  process.exit(0);
} catch (error) {
  console.error('Build script failed:', error);
  process.exit(1);
}
