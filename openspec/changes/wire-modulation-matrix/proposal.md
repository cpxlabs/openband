### Title
Apply modulation matrix (LFO / env / macro) to plugin params at playback

### Problem
`src/lib/modulationMatrix.ts` implements `computeModulation()` (11 sources × 11 targets) and is imported by `PluginEditor.tsx` and `OneKnob.tsx`, but modulation is **not applied at playback time**. The math exists; the render path ignores it.

### Why
Modulation is what makes a DAW feel alive (LFO on filter cutoff, envelope on gain, macro controlling multiple params). Without it, the matrix UI is decorative — a credibility gap for pro users.

### Scope
- Integrate `computeModulation()` into `renderMixdown()` so modulated params update `AudioParam`s over time.
- Bind UI controls to register mod routes into the matrix.
- **In scope:** playback-time application, UI binding.
- **Out of scope:** new modulation sources, new DSP (depends on `real-plugin-dsp` param ids).

### Success metric
A project with an LFO routed to a filter cutoff produces audible timbral motion; a macro knob moves $\geq 2$ plugin params simultaneously and audibly.
