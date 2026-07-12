# Mixer Console

## Overview
The Mixer Console is a 3D-rendered mixing desk at `app/mixing-console.tsx`. It visualizes a physical console with one channel strip per track (fader, pan, EQ knobs, mute/solo buttons) and a master section, plus a bank of `VuMeter` displays above the desk. The 3D scene is built with Three.js (loaded dynamically from CDN) and falls back to a disabled-state message if WebGL/Three.js is unavailable. The structural channel data (per-track fader/pan/mute/solo/grouping) is sourced from the project's `TrackDef[]` and `GroupDef[]` and reflects `TrackGroupManager` grouping.

## Implementation Notes
`app/mixing-console.tsx` builds the desk in a `useEffect` init function: `createChannelStrip` (`:121`) per channel up to `CHANNEL_COUNT = 16` (`:27`), `createVUMeter` (`:271`) × 4, a `masterSection` group (`:430`) with two master faders, and two DAW monitors. Each channel strip renders EQ knobs (3: Low/Mid/High), a fader cap, a pan knob, and mute/solo `Mesh` buttons (`:195-205`). The actual `VuMeter` React component lives at `src/components/VuMeter.tsx` (props `level`, `peakLevel`, `testID`) and is reused for 2D meter surfaces. The screen header reads "MIXING CONSOLE" (`:656`) and supports `router.back()`. The `LightControls` component (`:691`) animates accent lighting. There is no `Mixer.tsx` / `MixerTrack.tsx`; the console is the 3D scene itself.

## Requirements

### Requirement: Channel Strip Per Track
The console MUST render a channel strip for each of up to `CHANNEL_COUNT` (16) tracks, each showing a fader (level), a pan knob, three EQ knobs, a mute button, and a solo button, matching the underlying `TrackDef` state.

#### Scenario: Render channel strip
- **Given** a project with N tracks (N ≤ 16)
- **When** the 3D scene initializes (`createChannelStrip`, `:121`)
- **Then** N channel strips are added to the `channelGroup` (`:418-427`)
- **And** each strip shows fader cap, pan knob, 3 EQ knobs, mute + solo buttons

#### Scenario: Mute indicator reflects track state
- **Given** track index `i` has `muted` true
- **When** the strip is drawn
- **Then** the mute button `Mesh` uses the red emissive material (`index % 3 === 0` → `0xef4444`, `:197`)

### Requirement: VU Meter Display
The console MUST render VU meters using `createVUMeter` (`:271`) and MUST also expose the reusable `VuMeter` component (`src/components/VuMeter.tsx`) for level display. Meter fill color MUST transition green → yellow → red as level crosses `GREEN_TOP`/`YELLOW_TOP`/`RED_TOP` thresholds (`:9-11`, `:20-25`).

#### Scenario: VU level maps to fill height
- **Given** `VuMeter` receives `level = 0.5`
- **When** it renders
- **Then** the active fill height is `50%` and color is green (`clamp < 0.94`)
- **And** a peak-hold indicator renders when `peakLevel > 0.01` (`:50`)

#### Scenario: 3D console shows 4 VU meters
- **Given** the desk scene initialized
- **When** `createVUMeter` loops (`:471-475`)
- **Then** 4 VU meter `Group`s are added above the desk

### Requirement: Master Section
The console MUST render a dedicated master section to the right of the channel strips with at least one master fader and a "MASTER" label, summing all channel output.

#### Scenario: Master section present
- **Given** the desk scene initialized
- **When** `masterSection` is built (`:430-466`)
- **Then** a `MASTER` sprite label (`:458`) and master fader caps (`:434-447`) are rendered to the right of the last channel

### Requirement: Grouping Reflects Track Groups
When tracks are grouped via `TrackGroupManager`, the console's channel strips SHOULD visually cluster or tag member strips consistently with the group color from `GroupDef`/`createDefaultBuses` (`src/lib/busRouter.ts:90`), so the 3D layout matches the studio grouping state.

#### Scenario: Grouped tracks share visual identity
- **Given** tracks assigned to "bus-drums" (`assignTrackToBus`, `src/lib/busRouter.ts:116`)
- **When** the console renders their strips
- **Then** the strips carry the group color (`#ff6482` drums) consistent with `createDefaultBuses` (`:90-114`)

### Requirement: Graceful Fallback
If Three.js fails to load from all CDN sources (`loadThree`, `:308-319`), the console MUST show a disabled-state message ("3D Unavailable") instead of crashing, and the loading placeholder MUST appear until `threeLoaded` is true.

#### Scenario: Three.js unavailable
- **Given** no CDN returns a valid Three.js module
- **When** `init()` catches the load failure (`:329-331`)
- **Then** `loadError` is set and the "3D Unavailable" overlay renders (`:675-681`)
- **And** the app does not throw an unhandled error

## Test Requirements (Vitest)
- [ ] `VuMeter` renders a fill height proportional to `level` and clamps to [0,1]
- [ ] `VuMeter` color is green below `0.94`, yellow at `0.94-0.99`, red at ≥ `1.0`
- [ ] `VuMeter` shows a peak-hold indicator only when `peakLevel > 0.01`
- [ ] Mixing console header shows "MIXING CONSOLE" and a back button via `router.back()`
- [ ] Console schedules `CHANNEL_COUNT` (16) channel strips in `createChannelStrip`
- [ ] Console renders 4 VU meter groups via `createVUMeter`
- [ ] Console renders a master section with a `MASTER` label and master fader(s)
- [ ] When `loadThree` rejects, `loadError` is set and the fallback overlay renders without throwing
