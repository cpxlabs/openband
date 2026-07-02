---
name: feature-gap-closure
description: Workflow for systematically closing feature gaps in the OpenBand DAW project
source: auto-skill
extracted_at: '2026-07-02T09:30:00.000Z'
---

# Feature Gap Closure Workflow

## When to Use
- Implementing remaining features from a documented implementation plan
- Closing multiple feature gaps in sequence
- Each gap involves enhancing an existing component + library module

## Process

### Step 1: Read the implementation plan
```
docs/features-implementation.md
```
Identify remaining gaps, their priority, and dependencies.

### Step 2: Ask user for priority order
Present the remaining gaps as options. If user says "all in sequence", work through them in order of impact/effort.

### Step 3: For each feature gap

1. **Read existing code** — Read the component and library files that need enhancement
2. **Identify gaps** — Compare current state against the plan's requirements
3. **Plan changes** — Minimal scope, follow existing patterns
4. **Implement** — One feature at a time
5. **Verify** — tsc, vitest, build after each feature

### Step 4: Commit per feature (or batch related changes)
```
feat: <feature name> — <short description>

- bullet list of specific changes
- reference components and libraries modified
```

## Feature Patterns Applied

### Sampler Enhancement Pattern
- Use shared AudioContext (never create own)
- Add velocity control (0-127 MIDI standard)
- Add melodic keyboard with pitch-shifting via `playbackRate`
- Use tracked blob URLs for exports
- Transient detection: use onset detection function (energy difference), not just local maxima

### Chord Track Enhancement Pattern
- Separate chord-to-MIDI conversion into a pure function
- Harmonic analysis: pitch class histogram + template matching
- Markov chain suggestions: build from recent chord history
- Integrate with studio via existing chord state + MIDI track creation

### AutoMix Enhancement Pattern
- Add LUFS targets per role profile (-12 to -24 LUFS range)
- Calibrate volume to LUFS target instead of random within range
- Add spectral centroid computation from MIDI pitch distribution
- Add transient density (events/second) for percussion detection
- Classification: name-based regex first, spectral analysis fallback
- Export analysis report for UI integration

### Collaboration/Sharing Pattern
- ProjectMenu already has export/download — enhance it for cross-platform
- Web: create `<a>` element with blob URL, trigger click
- Native: use `OpenBandNative.showSaveDialog` + `writeFile`
- Import: use `showOpenDialog` + `readFile` + `importProject`
- Bridge interface uses `defaultPath` (not `defaultFileName`) for save dialogs

## Verification Checklist

After each feature:
- [ ] `npx tsc --noEmit` — zero new errors
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — production build succeeds
- [ ] Update tests if UI changed (preset counts, label text, etc.)

## Common Pitfalls

1. **Feature creep** — Stick to the gap definition. Don't redesign unrelated parts.
2. **Skipping verification** — Run tsc/vitest/build after EACH feature, not at the end.
3. **Unused imports** — When changing function signatures, check all call sites.
4. **Type mismatches** — New functions must match existing interfaces (e.g., MIDINote has only pitch/start/duration/velocity).
5. **Bridge API differences** — `SaveDialogOptions` uses `defaultPath`, not `defaultFileName`. Check `interface.ts` before using bridge methods.
