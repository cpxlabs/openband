# Tasks: Mixer Console 4-VU-Meter Groups

## Phase 1 — Spec (this change)
- [x] `openspec/changes/mixer-console-vu-groups/proposal.md`
- [x] `openspec/changes/mixer-console-vu-groups/design.md`
- [x] `openspec/changes/mixer-console-vu-groups/tasks.md`
- [ ] Commit spec files (after user approval)

## Phase 2 — Implement (after approval)
- [ ] Add `VU_GROUP_DEFS` constant to `app/mixing-console.tsx`.
- [ ] Add `createVUMeterGroup(THREE, x, y, z, label, color)` building a
      `THREE.Group` with a `createVUMeter` meter, a colored base bar, and a
      label sprite.
- [ ] Replace the 4-standalone-meter loop with a loop over `VU_GROUP_DEFS`
      calling `createVUMeterGroup`, spaced across the desk.
- [ ] Add Test Requirements to `openspec/specs/mixer-console/spec.md`.
- [ ] Update `docs/pending-implementations.md` (mixer-console 4-VU group → DONE).

## Phase 3 — Check (per AGENTS.md, in order)
- [ ] `npx tsc --noEmit`
- [ ] `cd backend && npx tsc --noEmit`
- [ ] `npx vitest run` (no regressions)
- [ ] `npm run test:legacy`
- [ ] `npm run build`
- [ ] code-review subagent

## Phase 4 — Commit & push
- [ ] Commit implementation + spec updates.
- [ ] `git push`.
