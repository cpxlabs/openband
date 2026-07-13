# Design: Audio Playback, Mastering, Export, and Loading Overhaul

## 1. Web Playback Fixes

### 1.1 Studio `togglePlay()` — Autoplay Guard

**File:** `app/studio/[id].tsx`

Wrap `audioSystem.ensureContext()` with a synchronous guard:

```ts
const ensureAudioContext = async () => {
  try {
    await audioSystem.ensureContext();
  } catch {
    setAutoplayBlocked(true);
    return false;
  }
  return true;
};
```

Add state: `const [autoplayBlocked, setAutoplayBlocked] = useState(false);`

In `togglePlay()`, first call `ensureAudioContext()`, and if it returns false, show a "Tap again to play" overlay via the new LoadingModal.

### 1.2 Feed `handlePlay()` — Add ensureContext

**File:** `app/tabs/index.tsx`

Before `webAudioRef.current.replace(url)` and `.play()`, call `await audioSystem.ensureContext()` (import `audioSystem` from `../lib/universalAudio`). Wrap in try/catch that falls back to a user-visible prompt.

### 1.3 Blob URL Cleanup — Extend Lifetime

**File:** `src/lib/universalAudio.ts`

- Increase `MAX_AGE_MS` from 300000 (5 min) to 900000 (15 min)
- Add `markBlobActive(url)` method that resets the timestamp for a URL to prevent mid-playback revocation
- Call `markBlobActive()` in studio's `togglePlay()` after `webAudio.replace(url)` succeeds

### 1.4 Error Surface

Add a `useEffect` in the studio that catches `webAudio.play()` errors and sets `autoplayBlocked = true`. The `LoadingModal` is used to display the message.

---

## 2. Mastering Polish

### 2.1 Bridge Data Validation

**File:** `src/lib/masteringBridge.ts`

- Add validation: `ensureMasteringInput(data)` throws if required fields missing
- Wrap `setMasteringInput` in try/catch in studio and extractor

### 2.2 DSP During Mastering Export

**File:** `src/components/MasteringSuite.tsx`

Modify `fetchAndRenderAudio()` to apply mastering plugin chain:

```ts
const applyMasteringChain = async (
  ctx: OfflineAudioContext,
  source: AudioBufferSourceNode,
  plugins: Plugin[],
) => {
  let node: AudioNode = source;
  for (const p of plugins) {
    if (!p.enabled) continue;
    node = connectMasteringPlugin(ctx, node, p);
  }
  node.connect(ctx.destination);
};
```

Where `connectMasteringPlugin()` creates the appropriate AudioNode for each type:
- `eq`: series of `BiquadFilterNode`
- `compressor`: `DynamicsCompressorNode`
- `truePeakLimiter`: `GainNode` (placeholder)
- `clipper`: `WaveShaperNode` with hard-clip curve
- Others: pass-through `GainNode`

Add progress callback wiring to `handleExport()`.

### 2.3 MasteringExport Tests

Test that `applyMasteringChain` connects nodes in order and respects bypass.

---

## 3. MP3 Export

### Option A: Add Real MP3 Encoding (Recommended)

**Add dependency:** `lamejs`

```bash
npm install --save lamejs
npm install --save-dev @types/lamejs
```

**File:** `src/lib/audio.ts`

```ts
import { Mp3Encoder } from "lamejs";

export function audioBufferToMp3Blob(
  buffer: AudioBuffer,
  bitRate: number = 320,
): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, bitRate);
  const samples = channelDataToMonoInterleaved(buffer);
  const mp3Data: Int8Array[] = [];
  const chunkSize = 1152;
  for (let i = 0; i < samples.length; i += chunkSize) {
    const chunk = samples.subarray(i, i + chunkSize);
    const mp3Buf = encoder.encodeBuffer(chunk);
    if (mp3Buf.length > 0) mp3Data.push(mp3Buf);
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(end);
  return new Blob(mp3Data, { type: "audio/mpeg" });
}
```

**Integrate into** `universalAudio.ts`, `BounceDialog.tsx`, `MasteringSuite.tsx`.

---

## 4. LoadingModal Component

### 4.1 Props

```tsx
interface LoadingModalProps {
  visible: boolean;
  title: string;
  message?: string;
  progress?: number;          // 0–100, omit for indeterminate
  phase?: string;             // e.g. "Rendering tracks..."
  subProgress?: number;       // 0–100 for phase detail
  onCancel?: () => void;
  cancelLabel?: string;       // default "Cancelar"
  testID?: string;
}
```

### 4.2 Integration

| Location | When | Props |
|----------|------|-------|
| Studio `togglePlay()` | Rendering audio | title="Preparando áudio" |
| BounceDialog `handleExport()` | Exporting | title="Exportando" |
| MasteringSuite `handleExport()` | Processing | title="Masterizando" |
| Extractor `processStems()` | Separating | title="Separando stems" |

---

## 5. Test Plan

### 5.1 `tests/lib8.test.ts` (~50 tests)

| Section | Tests |
|---------|-------|
| `audioBufferToMp3Blob` | 8 — Mono/stereo, 128/320 kbps, Blob type, empty, sample rate, channel count, null |
| `applyMasteringChain` | 10 — EQ chain, compressor, bypass, limiter, clipper, all bypassed, 0 plugins, gain makeup, mute, invalid type |
| `ensureMasteringInput` | 5 — valid, missing url, missing filename, null, stems |
| `markBlobActive` | 5 — resets timestamp, null no-op, active, expired cleanup, active preserved |
| `ensureContext` errors | 4 — reject sets state, prompt shown, no crash, retry succeeds |
| Feed ensureContext | 3 — called before play, error caught, fallback |

### 5.2 `tests/components6.test.tsx` (~55 tests)

| Section | Tests |
|---------|-------|
| `LoadingModal` | 15 — hidden, title, message, spinner, progress bar, pct, phase, sub, cancel, onCancel, auto-close, testID, backdrop, a11y |
| Master real DSP | 10 — plugins applied, bypassed skipped, chain connects, empty chain, compressor, EQ, progress callback, cancel, error |
| Web playback errors | 8 — autoplayBlocked, prompt shown, retry, ensureContext, blob active, feed ensureContext, no crash, cleanup |
| MP3 in BounceDialog | 8 — option visible, bitrate selector, 128k, 320k, format switch hides bitrate, correct encoder, mastering MP3, fallback |
| Export progress | 6 — progress updates, cancel, progress persists, phase label |

### 5.3 Updates to existing tests

- `tests/studio.test.tsx` — autoplayBlocked assertions, ensureContext mock
- `tests/screens2.test.tsx` — feed ensureContext call verification
