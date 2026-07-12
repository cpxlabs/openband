# OpenBand — Product Narrative

## Vision
OpenBand is the open-source DAW that runs everywhere and lets you own your music.
No subscription, no platform lock-in, no "your projects belong to us." If you can
open a browser, you can record, produce, master, and collaborate.

## Who it's for
- Bedroom producers who don't want to rent Adobe/BandLab/Soundtrap forever.
- Educators who need a free, inspectable DAW that runs on a school Chromebook.
- Communities that want to collaborate on tracks without handing data to a silo.
- Developers who want a DAW they can fork, extend, and self-host.

## Positioning
| Vs. | OpenBand's angle |
|-----|------------------|
| BandLab / Soundtrap | Self-hostable, no rent, no data silo |
| GarageBand | Cross-platform: web + Android + Windows + Electron |
| Reaper | Free + collaborative + code-accessible |
| Audacity | Modern UI, MIDI, plugins, CRDT collab |

## The open promise
- **Own your data:** SQLite locally, Supabase optional, S3-exportable.
- **Open code:** fork it, audit the DSP, write your own plugin.
- **Open format ambition:** DAWproject interop so you're never trapped.

## Strategy by phase
- **Phase 0 — Make it work:** web playback must be audible and stable. A silent
  DAW is not a product. (web-player-studio-audio, real-plugin-dsp,
  wire-modulation-matrix, real-lufs-meter)
- **Phase 1 — Make them stay:** first-run onboarding + a light social feed for
  retention. DAW-first, social as a thin layer — not a BandLab rebuild.
- **Phase 2 — Differentiate:** video export for shareability, MIDI Learn + MCU
  for pro hardware, DAWproject for switch-cost elimination.
- **Phase 3 — The moat:** AI Voice Cleaner (pairs with existing Demucs stems)
  and WASM off-thread DSP.

## Success metrics
- **Activation:** % of new web visitors who create/load a project AND hear audio.
- **Retention:** % returning within 7 days (post-onboarding + feed).
- **Credibility:** LUFS accuracy within ±0.5 of reference; plugin DSP verifiable.

## Non-goals (for now)
- Competing with Ableton on live performance.
- Building a full social network — feed is a retention loop, not the product.
- Native-mobile audio parity in Phase 0 (web-first).
