## 1. Tune panel
- [ ] Add `src/components/TunePanel.tsx` with key/scale/amount/speed/formant/mix controls bound to the track's `autoPitch` plugin via `onParamChange`.
- [ ] Ensure a track gets an `autoPitch` plugin instance (create via `getDefaultParams("autoPitch")`) when Tune is opened; enable it.
- [ ] Register `autoPitch` in `PluginEditor` `EDITOR_MAP` (route to `TunePanel`) so it is first-class alongside the 19 types.
- [ ] Studio track header / toolbar gains a "Tune" affordance opening `TunePanel` for the selected track.

## 2. Key/scale detection
- [ ] `src/lib/keyDetection.ts` — `detectKey(buffer): { key, scale, confidence }` via pitch-class histogram / autocorrelation; best-effort, returns suggestion only.
- [ ] Tune panel "Detect key" button runs it on the selected region and fills the key selector.

## 3. Live pitch readout
- [ ] `src/lib/pitchEstimate.ts` — `estimatePitch(frame, sampleRate): number | null` (autocorrelation).
- [ ] Expose/reuse an `AnalyserNode` from `PlaybackEngine`; Tune panel shows detected note + corrected target while playing.
- [ ] Add Vitest: `estimatePitch` returns the correct frequency for a synthetic sine; `detectKey` returns the right key for a monophonic tone (within ±1 semitone / expected key).

## 4. Verification
- [ ] `npx tsc --noEmit` clean; `npx vitest run` green.
- [ ] Manual: load vocal region, Tune → pick key/scale → hear scale-snap; live readout tracks pitch; Detect key proposes correct key.

## Notes
- DSP already exists (`autoPitch` in `applyPluginChain`); this change is UX + control surfacing + readout.
- Web-first; native shows static config (no live analyser).
