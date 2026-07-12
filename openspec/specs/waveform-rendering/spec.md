# Waveform Rendering

## Overview
OpenBand renders audio waveforms on HTML5 Canvas. `generatePeakData` (`src/lib/canvasWaveform.ts`) reduces an `AudioBuffer` to per-second peak amplitudes; `renderWaveformCanvas` draws a min/max 2D waveform with viewport culling and `devicePixelRatio` scaling; `WaveformCanvas` (`src/components/WaveformCanvas.tsx`) is the React wrapper handling zoom and DPR; `LiveWaveformCanvas` (`src/components/LiveWaveformCanvas.tsx`) redraws via `requestAnimationFrame`; and `WaveformClip` (`src/components/WaveformClip.tsx`) is a small presentational clip.

## Implementation Notes
`generatePeakData(audioBuffer, peaksPerSecond = 50)` reads channel 0, walks `sampleRate / peaksPerSecond` samples per peak, and records the max absolute amplitude per block (range `[0, 1]`). `renderWaveformCanvas` computes `startSample = floor(scrollOffset * samplesPerPixel)` and only iterates the visible column range `[0, visibleWidth)`, performing a single-pass min/max per pixel column (culling offscreen samples). `getVisibleRange` returns the `{ start, end }` index window for a virtual scroll viewport. The React components scale the backing store by `window.devicePixelRatio` and use `requestAnimationFrame` for live redraws.

## Requirements

### Requirement: Peak-Data Generation
The system MUST reduce an `AudioBuffer` channel-0 signal into a peak array where each peak is the maximum absolute sample amplitude in its block, yielding values within `[0, 1]`.

#### Scenario: Generate bounded peaks
- **Given** an `AudioBuffer` of length N at sampleRate R with `peaksPerSecond` = P
- **When** `generatePeakData(buffer, P)` is called
- **Then** every returned peak is in `[0, 1]`
- **And** the returned array length ≈ `N / (R / P)`

### Requirement: Canvas 2D Min/Max Render
The system MUST render a waveform on a 2D canvas by computing per-column min and max sample values across `samplesPerPixel` and drawing a centered bar, filling a `#18181c` background.

#### Scenario: Draw visible waveform
- **Given** a canvas, a buffer, `samplesPerPixel`, and `visibleWidth`
- **When** `renderWaveformCanvas` runs
- **Then** the canvas backing store is sized to `visibleWidth × height`
- **And** only the visible sample range is processed (virtual scroll offset applied)

### Requirement: Virtual Scroll / Viewport Culling
The system MUST, given a virtual-scroll state (`scrollTop`, `viewportHeight`, `totalHeight`, `itemHeight`), compute a visible index window that excludes offscreen items via `getVisibleRange`.

#### Scenario: Cull offscreen rows
- **Given** `scrollTop=100`, `viewportHeight=500`, `totalHeight=1000`, `itemHeight=50`
- **When** `getVisibleRange(state)` is called
- **Then** the returned `{ start, end }` window starts before the first visible row and ends after the last, clamped to `[0, totalHeight/itemHeight]`

### Requirement: devicePixelRatio Scaling
The React `WaveformCanvas` MUST set the canvas backing-store width/height scaled by `window.devicePixelRatio` so the waveform is crisp on high-DPI displays, while the CSS size stays in logical pixels.

#### Scenario: Scale backing store by DPR
- **Given** `window.devicePixelRatio = 2` and a logical width W
- **When** `WaveformCanvas` renders
- **Then** the canvas backing store width equals `W * 2`

### Requirement: Live rAF Redraw
The `LiveWaveformCanvas` component MUST redraw the waveform on each animation frame via `requestAnimationFrame` while playing, and stop the loop on unmount.

#### Scenario: Continuous redraw while playing
- **Given** `LiveWaveformCanvas` mounted with `visible=true`
- **When** playback is active
- **Then** the waveform is redrawn each frame via `requestAnimationFrame`
- **And** the frame loop is cancelled on unmount

## Test Requirements (Vitest)
- [ ] `generatePeakData` returns peaks bounded in `[0, 1]` with length ≈ `N / (R / P)`
- [ ] `renderWaveformCanvas` sizes the backing store to `visibleWidth × height` and only draws the visible sample range
- [ ] `getVisibleRange` returns a clamped `{ start, end }` window for a virtual-scroll state
- [ ] `WaveformCanvas` scales the backing store by `window.devicePixelRatio`
- [ ] `LiveWaveformCanvas` schedules `requestAnimationFrame` redraws and cancels on unmount
