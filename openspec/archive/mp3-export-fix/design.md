# Design: MP3 Export Crash Fix

## Technical Approach

### 1. `src/lib/audio.ts`
We will rewrite `audioBufferToMp3Blob` into an asynchronous version that processes the buffer in batches and yields.

```typescript
export async function audioBufferToMp3BlobAsync(buffer: AudioBuffer, kbps: number = 192): Promise<Blob> {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  const sampleBlockSize = 1152; 
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right.subarray(i, i + sampleBlockSize);
    const leftInt16 = new Int16Array(leftChunk.length);
    const rightInt16 = new Int16Array(rightChunk.length);

    for (let j = 0; j < leftChunk.length; j++) {
      leftInt16[j] = Math.max(-32768, Math.min(32767, Math.round(leftChunk[j] * 32767)));
      rightInt16[j] = Math.max(-32768, Math.min(32767, Math.round(rightChunk[j] * 32767)));
    }

    const mp3buf = encoder.encodeBuffer(leftInt16, numChannels > 1 ? rightInt16 : undefined);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    // Yield to the main thread every 100 blocks (~115k samples / ~2.6 seconds of audio)
    if (i % (sampleBlockSize * 100) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Data.push(new Uint8Array(flush));
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: "audio/mpeg" });
}
```

### 2. `src/components/MasteringSuite.tsx`
Update the import and the export handler:
```typescript
import { audioBufferToWavBlob, audioBufferToMp3BlobAsync } from "../lib/audio";

// ... inside handleExport
const blob = exportFormat === "mp3"
  ? await audioBufferToMp3BlobAsync(rendered, 192)
  : audioBufferToWavBlob(rendered, bd);
```
