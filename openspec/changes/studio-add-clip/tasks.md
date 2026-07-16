# Tasks: Studio "Add Clip" Action

## Phase 1 — Spec (this change)
- [x] `openspec/changes/studio-add-clip/proposal.md`
- [x] `openspec/changes/studio-add-clip/design.md`
- [x] `openspec/changes/studio-add-clip/tasks.md`
- [ ] Commit spec files (after user approval)

## Phase 2 — Implement (after approval)
- [ ] Add `handleAddClip` to `app/studio/[id].tsx`: append `TrackRegion` to selected track at end of regions; if none selected, create a new audio track with one clip and select it. Use `numBars`/`initialBpm` for default duration.
- [ ] Add a toolbar "▦ Clip" `Pressable` after the Import button.
- [ ] Register `clip.add` command (optional keybinding `Ctrl+Shift+C`); add to dep array.
- [ ] Add Test Requirements to `openspec/specs/studio-daw/spec.md`.
- [ ] Update `docs/pending-implementations.md` (studio-daw add-clip → DONE).
- [ ] Add `tests/studio.test.tsx` test(s) for the Add Clip action.

## Phase 3 — Check (per AGENTS.md, in order)
- [ ] `npx tsc --noEmit`
- [ ] `cd backend && npx tsc --noEmit`
- [ ] `npx vitest run tests/studio.test.tsx`
- [ ] `npx vitest run` (no regressions)
- [ ] `npm run test:legacy`
- [ ] `npm run build`
- [ ] code-review subagent

## Phase 4 — Commit & push
- [ ] Commit implementation + tests + spec updates.
- [ ] `git push`.
