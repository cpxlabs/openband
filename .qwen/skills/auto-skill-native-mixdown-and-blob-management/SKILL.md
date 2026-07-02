---
name: native-mixdown-and-blob-management
description: Pattern for rendering audio mixdowns on native platforms without OfflineAudioContext, plus centralized blob URL lifecycle management
source: auto-skill
extracted_at: '2026-07-02T09:15:00.000Z'
---

# Native Mixdown and Blob URL Management

## Problem

`OfflineAudioContext` is web-only. On iOS/Android/Electron, pre-rendering a multi-track mixdown produces silence. Additionally, `URL.createObjectURL` calls across the codebase leak memory if not properly revoked.

## Native Mixdown Pattern

Replace the silent stub with a pure JS decoder + mixdown engine:

```typescript
// In universalAudio.ts
private async renderMixdownNative(
  tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[] }[],
  duration: number,
  sampleRate: number,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  // 1. Filter audible tracks (respect solo/mute)
  const anySolo = tracks.some((t) => t.solo);
  const audible = tracks.filter((t) => anySolo ? t.solo && !t.muted : !t.muted);

  // 2. Allocate stereo buffers
  const totalSamples = Math.ceil(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // 3. Fetch + decode each region's audio
  for (const track of audible) {
    const trackGain = track.volume / 100;
    const pan = track.pan / 100;
    const leftGain = trackGain * (pan < 0 ? 1 : 1 - pan);
    const rightGain = trackGain * (pan > 0 ? 1 : 1 + pan);

    for (const region of track.regions) {
      if (!region.url) continue;
      const resp = await fetch(region.url, { credentials: "omit" });
      const ab = await resp.arrayBuffer();
      const decoded = await this.decodeAudioPureJS(ab, sampleRate);

      // 4. Mix into stereo buffer at correct offset
      const startSample = Math.floor(region.start * sampleRate);
      for (let i = 0; i < Math.min(decoded.length, totalSamples - startSample); i++) {
        left[startSample + i] += decoded[i] * leftGain;
        right[startSample + i] += decoded[i] * rightGain;
      }
    }
  }

  // 5. Encode to WAV blob
  return this.float32ToWavBlob(left, right, sampleRate, 24);
}
```

### Pure JS WAV Decoder

```typescript
private async decodeAudioPureJS(arrayBuffer: ArrayBuffer, _targetSampleRate: number): Promise<Float32Array> {
  const view = new DataView(arrayBuffer);
  const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));

  if (header === "RIFF") {
    const format = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (format === "WAVE") {
      const numChannels = view.getUint16(22, true);
      void view.getUint32(24, true); // sampleRate — unused
      const bitsPerSample = view.getUint16(34, true);
      const dataOffset = 44;
      const dataLength = Math.min(view.getUint32(40, true), arrayBuffer.byteLength - dataOffset);

      if (bitsPerSample === 16) {
        const numSamples = dataLength / (numChannels * 2);
        const samples = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          let sum = 0;
          for (let ch = 0; ch < numChannels; ch++) {
            const val = view.getInt16(dataOffset + (i * numChannels + ch) * 2, true);
            sum += val / 32768;
          }
          samples[i] = sum / numChannels;
        }
        return samples;
      }
    }
  }
  // Fallback: silence
  return new Float32Array(Math.ceil(_targetSampleRate * 0.5));
}
```

### Stereo WAV Encoder

```typescript
private float32ToWavBlob(left: Float32Array, right: Float32Array, sampleRate: number, bitDepth: number): Blob {
  const length = left.length;
  const numChannels = 2;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const ab = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(ab);

  // Write WAV header (RIFF/WAVE/fmt /data)
  const ws = (o: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i)); };
  ws(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); ws(8, "WAVE");
  ws(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true); ws(36, "data"); view.setUint32(40, dataSize, true);

  // Write interleaved samples
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = ch === 0 ? left[i] : right[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(headerSize + (i * numChannels + ch) * bytesPerSample, val, true);
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}
```

## ChunkedRenderer Stereo Fix

**Before (mono only):**
```typescript
const channelData = rendered.getChannelData(0); // LEFT CHANNEL ONLY
chunks.push(new Float32Array(channelData));
// ...
const offlineCtx = new OfflineAudioContext(1, merged.length, sampleRate); // MONO
```

**After (stereo):**
```typescript
const left = rendered.getChannelData(0);
const right = rendered.getChannelData(1);
const interleaved = new Float32Array(left.length * 2);
for (let i = 0; i < left.length; i++) {
  interleaved[i * 2] = left[i];
  interleaved[i * 2 + 1] = right[i];
}
chunks.push(interleaved);
// ...
const mergedLeft = new Float32Array(numSamples);
const mergedRight = new Float32Array(numSamples);
// De-interleave chunks into separate L/R buffers
const buffer = new OfflineAudioContext(2, numSamples, sampleRate).createBuffer(2, numSamples, sampleRate);
buffer.getChannelData(0).set(mergedLeft);
buffer.getChannelData(1).set(mergedRight);
```

## Centralized Blob URL Management

Replace scattered `URL.createObjectURL` / `URL.revokeObjectURL` calls with a tracked registry:

```typescript
// universalAudio.ts
const blobUrlRegistry = new Map<string, number>();
const MAX_ENTRIES = 100;
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function createTrackedBlob(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  blobUrlRegistry.set(url, Date.now());
  cleanupBlobUrls();
  return url;
}

export function revokeTrackedBlob(url: string): void {
  blobUrlRegistry.delete(url);
  try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
}

function cleanupBlobUrls(): void {
  const now = Date.now();
  for (const [url, created] of blobUrlRegistry) {
    if (now - created > MAX_AGE_MS) {
      blobUrlRegistry.delete(url);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
  }
  if (blobUrlRegistry.size > MAX_ENTRIES) {
    const oldest = [...blobUrlRegistry.entries()].sort((a, b) => a[1] - b[1])
      .slice(0, blobUrlRegistry.size - MAX_ENTRIES);
    for (const [url] of oldest) {
      blobUrlRegistry.delete(url);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
  }
}
```

## Common Pitfalls

1. **`decodeAudioPureJS` unused sampleRate** — The WAV header contains sampleRate but the pure JS decoder doesn't resample. Use `void` to suppress TS error: `void view.getUint32(24, true)`.

2. **ChunkedRenderer interleaving math** — Each chunk is `length * 2` samples (interleaved L/R). The merge step must divide by 2 to get actual sample count.

3. **Blob URL in error paths** — If `renderTracksToUrl` creates a URL then throws, the URL leaks. `createTrackedBlob` auto-cleans via the registry's age/size limits.

4. **Native fetch credentials** — Use `{ credentials: "omit" }` when fetching region URLs on native to avoid CORS issues with blob URLs.

5. **Pan law** — The simple pan law used here (`leftGain = pan < 0 ? 1 : 1 - pan`) is linear, not equal-power. For production, consider `Math.cos(pan * π/4)` / `Math.sin(pan * π/4)`.
