# Design: Mastering Suite Audio Export Polish

## Export Architecture
1. **`fetchAndRenderAudio`**: Will still render the raw `AudioBuffer` from the OfflineAudioContext.
2. **`audioBufferToWavBlob` (Existing)**: Generates `.wav` files (supports 16 and 24-bit).
3. **`audioBufferToMp3Blob` (New)**: 
   - Will take the rendered `AudioBuffer`.
   - Iterate through the channel data (left/right).
   - Convert Float32 (`-1.0` to `1.0`) to Int16 (`-32768` to `32767`).
   - Feed chunks into `lamejs.Mp3Encoder(channels, sampleRate, kbps)`.
   - Return a `Blob` of type `audio/mpeg`.

## Code Modifications
### 1. `src/lib/audioExport.ts` (or `universalAudio.ts`)
Add the `audioBufferToMp3Blob` function.
```typescript
import { Mp3Encoder } from 'lamejs';

export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps: number = 192): Blob {
  // Float32 to Int16 conversion and MP3 encoding logic...
}
```

### 2. `src/components/MasteringSuite.tsx`
Update the `handleExport` method:
```typescript
const blob = exportFormat === "mp3" 
  ? audioBufferToMp3Blob(rendered, 192) // default 192kbps for MP3
  : audioBufferToWavBlob(rendered, bd); // user selected bit depth
```

### 3. Tests (`tests/audioExport.test.ts`)
- Test `audioBufferToWavBlob` for correct WAV header generation.
- Mock `lamejs` and verify `audioBufferToMp3Blob` correctly extracts Float32 arrays and invokes the encoder.

## Studio Header UI Refinement
### `app/studio/[id].tsx`
- **Tool Bar Overflow**: Wrap the massive list of tool buttons (Metronome, Tuner, Synths, Loopers, etc.) inside a `ScrollView horizontal` or a flex-wrap container so they don't force the transport bar to overlap.
- **Pitch/Rate Compactness**: Adjust the styling of the pitch shift and time stretch controls so they don't collide with the Save/Export buttons on the right. Give the top header row `flex-wrap` if necessary, or restrict `minWidth`.

## Mixer Controls Implementation
### `app/studio/[id].tsx`
- Bind the Mixer channel components to update `tracks[i].muted` and `tracks[i].solo`.
- Bind the Volume and Pan sliders in the Mixer to update the `tracks[i].automation.volume` and `tracks[i].automation.pan` base values.
- Ensure that the audio rendering engine respects these properties when playing back or exporting.
