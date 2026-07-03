# OpenBand Roadmap

## ▶ PLAY
- [ ] Web audio playback with shared state
- [ ] Tab navigation (Feed, Biblioteca, Momentos, Conta, Ajustes)
- [ ] Desktop sidebar + persistent navigation
- [ ] MiniPlayer with transport controls across all screens

## 🏠 STUDIO 3D
- [x] Three.js isometric virtual room (CDN fallback)
- [x] Furniture: Mixer, Mastering, Timeline, Piano Roll, Pedalboard, Synth
- [x] WASD movement + click-to-open
- [x] Sidebar sub-items for each studio station
- [ ] Multi-user avatar presence (WebSocket)
- [ ] Drag-and-drop furniture rearrangement

### 🔀 MIXER
- [ ] Multi-track mixer with faders + pan
- [ ] Bus routing + sub-mix groups
- [ ] VU meters per track
- [ ] Mute/solo per channel

### 🎚 MASTERING
- [ ] Full mastering chain (EQ, Compressor, Limiter)
- [ ] LUFS metering + true peak detection
- [ ] A/B version comparison
- [ ] Export bounced master

### 📦 VERSIONS
- [ ] CRDT-based version history
- [ ] Branch/fork/merge for project variants
- [ ] Commit timeline graph
- [ ] Selective merge acceptance

### 🎹 MIDI/MPC
- [ ] MIDI input device support
- [ ] MPC pad grid with velocity sensitivity
- [ ] MIDI Learn for parameter mapping
- [ ] External MIDI controller auto-detect

## 🆕 NOVO PROJETO

### Trap
- [ ] Genre template: 808 bass, hi-hat rolls, snare patterns
- [ ] Default BPM range: 130-150
- [ ] Pre-configured plugin chain (distortion, saturation)

### Rock
- [ ] Genre template: guitar, bass, drums, vocals
- [ ] Amp sim + cabinet IR presets
- [ ] Default time signatures: 4/4, 7/8

### LoFi
- [ ] Genre template: vinyl crackle, tape warmth, sidechain
- [ ] Default BPM range: 70-90
- [ ] Pre-configured LoFi mastering chain

### Metal
- [ ] Genre template: double kick, distorted guitars, screaming vocals
- [ ] High-gain amp presets
- [ ] Noise gate + gate sidechain

### House
- [ ] Genre template: four-on-floor, synth bass, vocal chops
- [ ] Default BPM range: 120-130
- [ ] Sidechain compressor preset

### Dance Hall
- [ ] Genre template: dembow rhythm, brass, vocal samples
- [ ] Default BPM range: 90-110
- [ ] Reverb/delay send effects

## 📋 ADDITIONAL TASKS

### 🎙 REC
- [ ] Multi-track recording with source selection
- [ ] Input monitoring + latency compensation
- [ ] Punch in/out recording
- [ ] Take comping

### ✏️ EDIT
- [ ] Region trimming/splitting/moving
- [ ] Crossfade between regions
- [ ] Time-stretch without pitch change
- [ ] Pitch correction / transpose

### 🎤 TUNE (Real-Time)
- [ ] Auto-tune / pitch correction plugin
- [ ] Key/scale detection from audio
- [ ] Real-time formant preservation
- [ ] Visual pitch correction display
