# Tasks: Voice Cleaner SNR/RMS Metrics

## Phase 1 — Spec (this change)
- [x] `openspec/changes/voice-cleaner-metrics/proposal.md`
- [x] `openspec/changes/voice-cleaner-metrics/design.md`
- [x] `openspec/changes/voice-cleaner-metrics/tasks.md`
- [ ] Commit spec files (after user approval)

## Phase 2 — Implement (after approval)
- [ ] Add `measureRMS` and `measureSNR` to `src/lib/plugins/voiceCleaner.ts`.
- [ ] Export `SampleArray` type (or inline union).
- [ ] Mark the two Test Requirements `[x]` in `openspec/specs/ai-voice-cleaner/spec.md`.
- [ ] Update `docs/pending-implementations.md` (voice cleaner section → DONE).
- [ ] Add `tests/voiceCleanerMetrics.test.ts` with the spec scenarios.

## Phase 3 — Check (per AGENTS.md, in order)
- [ ] `npx tsc --noEmit`
- [ ] `cd backend && npx tsc --noEmit`
- [ ] `npx vitest run tests/voiceCleanerMetrics.test.ts`
- [ ] `npx vitest run` (no regressions)
- [ ] `npm run test:legacy`
- [ ] `npm run build`
- [ ] code-review subagent

## Phase 4 — Commit & push
- [ ] Commit implementation + tests + spec updates.
- [ ] `git push`.
