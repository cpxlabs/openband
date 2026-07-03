---
name: iframe-webgl-explorer-pattern
description: Pattern for embedding WebGL content (three.js, 3D tiles) in React Native Web via iframe with srcDoc, dynamic token injection, and error handling
source: auto-skill
extracted_at: '2026-07-03T13:27:26.036Z'
---

## When to Use

- Embedding three.js / WebGL viewers in a React Native Web app
- Loading CDN-based JavaScript libraries that aren't npm-installable
- Isolating heavy WebGL content from the main React render tree
- Features requiring `importmap` or ES module imports from CDN

## Pattern

### 1. Use iframe with srcDoc (not src URL)

Build the entire HTML page as a string and pass it via `srcDoc`. This avoids needing a separate HTML file or server endpoint:

```tsx
const srcDoc = token ? buildGlobeHtml(token) : "";

<iframe
  srcDoc={srcDoc}
  title="3D Viewer"
  className="w-full h-full border-0"
  onLoad={() => setIframeReady(true)}
  onError={() => setIframeError("Failed to load")}
  style={{ display: iframeReady ? "block" : "none" }}
/>
```

### 2. Use array-based HTML builder (NOT template literals)

Template literals inside `.tsx` files confuse Metro's Babel transformer — it tries to parse embedded CSS/JS as JSX. Use an array of strings joined by newlines:

```ts
function buildGlobeHtml(ionToken: string) {
  return [
    "<!DOCTYPE html>",
    "<html lang='en'>",
    "<head>",
    "<meta charset='utf-8'>",
    "<style>",
    "*{margin:0;padding:0;box-sizing:border-box}",
    "body{background:#000;overflow:hidden}",
    "</style>",
    "</head>",
    "<body>",
    "<script type='importmap'>{\"imports\":{...}}</script>",
    "<script type='module'>",
    "const TOKEN='" + ionToken + "';",
    "// three.js code here",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}
```

### 3. Load CDN libraries via importmap

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three';
</script>
```

### 4. Token input flow

Show a token input screen first, then load the iframe only after the user provides a valid token:

```tsx
if (!token) {
  return <TokenInputScreen onSubmit={setToken} />;
}
return <iframe srcDoc={buildGlobeHtml(token)} />;
```

### 5. Communication with parent

The iframe can signal readiness to the parent:

```js
// Inside iframe
window.parent.postMessage({ type: 'globe-ready' }, '*');

// In React parent
window.addEventListener('message', (e) => {
  if (e.data?.type === 'globe-ready') setIframeReady(true);
});
```

## What NOT to do

- **Do NOT use template literals** for the HTML string inside `.tsx` files — Metro will try to parse the embedded CSS/JS as JSX and fail with syntax errors.
- **Do NOT use `allow="webgl; webxr"`** on the iframe — React Native Web's React doesn't recognize these as valid feature flags and logs warnings.
- **Do NOT install three.js via npm** if you're using CDN imports inside the iframe — it's isolated and doesn't need the npm package.
- **Do NOT hardcode expired API tokens** — use a token input flow instead.

## Common CDN packages

| Library | CDN URL |
|---------|---------|
| three.js | `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js` |
| 3d-tiles-renderer | `https://cdn.jsdelivr.net/npm/3d-tiles-renderer@0.4.27/build/index.js` |
| DRACOLoader addons | `https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/DRACOLoader.js` |
