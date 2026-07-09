#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

rm -rf dist
mkdir -p dist

START_PORT=8085

# Clean any stale Metro state
rm -rf .expo/metro-cache 2>/dev/null || true

# Start dev server in background
npx expo start --web --no-dev --port $START_PORT > /tmp/expo-start.log 2>&1 &
EXPO_PID=$!

cleanup() {
  kill $EXPO_PID 2>/dev/null || true
  wait $EXPO_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be ready
echo "Waiting for Metro on port $START_PORT..."
for i in $(seq 1 90); do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$START_PORT/" 2>/dev/null | grep -q 200; then
    echo "Metro ready!"
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "Timeout. Log tail:"
    tail -20 /tmp/expo-start.log
    exit 1
  fi
  sleep 1
done

# Download the SPA HTML
echo "Downloading index.html..."
curl -s -o dist/index.html "http://localhost:$START_PORT/"

# Extract bundle URL from the HTML
BUNDLE_URL=$(grep -oP 'src="\K[^"]*\.bundle[^"]*' dist/index.html | head -1)
echo "Bundle URL: $BUNDLE_URL"

# Download bundle
curl -s -o dist/bundle.js "http://localhost:$START_PORT$BUNDLE_URL"
echo "bundle.js: $(wc -c < dist/bundle.js) bytes"

# Rewrite HTML to reference local bundle
sed -i "s|<script src=\"$BUNDLE_URL\" defer></script>|<script src=\"/bundle.js\" defer></script>|" dist/index.html

# Copy static assets
node scripts/post-export.js

echo "Build done."
ls -la dist/
