# Proposal: MP3 Export Crash Fix

## Context
A user reported that exporting to MP3 fails on Android Web, while WAV export works fine. The issue stems from the `audioBufferToMp3Blob` function in `src/lib/audio.ts`.

Currently, this function executes the entire MP3 encoding process (`lamejs.Mp3Encoder`) within a single synchronous `for` loop. For an average 3-minute song, this deeply freezes the main UI thread, causing mobile browsers (especially Chrome on Android) to kill the tab due to an "Application Not Responding" (ANR) timeout. WAV export does not have this issue because it's significantly faster (just bit-shifting, no complex encoding).

## Objectives
- Prevent the browser tab from freezing and crashing during MP3 export on lower-end devices.
- Refactor the MP3 export loop to be asynchronous so it yields to the main thread.

## Scope
- Modify `audioBufferToMp3Blob` in `src/lib/audio.ts` to be an `async` function (`audioBufferToMp3BlobAsync`) that yields to the event loop every few chunks.
- Update `MasteringSuite.tsx` (the only consumer of MP3 export) to `await` the new async function.
