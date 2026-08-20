# Tasks: V10 Creative Iteration

## A. Exact promotion (implementation target)

- [x] A1. Approved snapshot music hash equals promoted project music hash — `src/lib/snapshotPromotion.ts` `contentHash` + `tests/projectStarterPromotion.test.ts`.
- [x] A2. Persistent ID re-key does not alter notes/timing/plugins/pan/volume/arrangement — `src/lib/snapshotPromotion.ts` `normalizedRecipe` + `tests/projectStarterPromotion.test.ts`.
- [x] A3. Promotion does not invoke generation again — wire `src/components/NewProject.tsx` + `src/lib/projectStarter.ts` to call the gate and reuse the approved snapshot.
- [x] A4. Stale unapproved render cannot replace approved snapshot — `src/lib/snapshotPromotion.ts` `computeStale` + `tests/projectStarterPromotion.test.ts`.
- [x] A5. UI parameter edits after approval do not silently mutate approved content — `src/lib/snapshotPromotion.ts` `normalizedRecipe`/`computeStale` + `tests/projectStarterPromotion.test.ts`.
- [x] A6. Double tap Create creates one project — route Create through a stable per-session `createPromotionGate`.
- [x] A7. Re-render of NewProject does not create duplicate project — stabilize gate instance across renders.
- [x] A8. Closing wizard creates no project — only explicit Create invokes promotion.
- [x] A9. Failed persistence leaves approval state recoverable/retriable without duplicate project — gate minting deferred until persistence success.
- [x] A10. Preview blob URLs are not stored as durable project assets unless explicitly promoted — session-scoped preview isolation in promotion path.

## B. Seed determinism (planned phase)
- [x] B11. Same recipe+seed+generator version => same normalized content hash.
- [x] B12. Different seeds => at least one unlocked musical dimension differs.
- [x] B13. Seed serialization round-trip preserves output.
- [x] B14. Invalid/missing seed is normalized deterministically.
- [x] B15. Generation does not read global Math.random in tested variation path.
- [x] B16. Web/native normalized musical content matches for same recipe.

## C. Locks (planned phase)
- [x] C17. Rhythm lock preserves drum event hash.
- [x] C18. Bass lock preserves bass role hash.
- [x] C19. Harmony lock preserves chord/harmonic event hash.
- [x] C20. Melody lock preserves melody role hash.
- [x] C21. FX lock preserves plugin/preset normalized hash.
- [x] C22. Multiple locks compose.
- [x] C23. All locks + regenerate yields equivalent musical snapshot.
- [x] C24. Changing BPM with locked content follows documented transform/reject policy.
- [x] C25. Changing key with locked harmony follows documented transform/reject policy.
- [x] C26. Changing genre detects incompatible locks.
- [x] C27. Incompatible lock is never silently discarded.

## D. Variation history (planned phase)
- [x] D28. Default history keeps 3 snapshots.
- [x] D29. Hard max keeps at most 5.
- [x] D30. Selected snapshot is not evicted.
- [x] D31. Eviction revokes unused preview resource.
- [x] D32. Switching A/B does not regenerate content.
- [x] D33. Promoting B promotes B, not latest generated C.
- [x] D34. Session reset clears history safely.

## E. Arrangement preview (planned phase)
- [x] E35. Known subgenre returns arrangement sections — `src/lib/arrangementGenerator.ts` `generateArrangement`.
- [x] E36. Representative selector chooses <= configured max windows.
- [x] E37. Selected windows stay within preview budget.
- [x] E38. At least one high-energy section is selected when available.
- [x] E39. Low/medium contrast is selected when available.
- [x] E40. No-arrangement genre falls back to short-loop preview.
- [x] E41. Manual section selection plays requested section.
- [x] E42. BPM/key change invalidates render cache but not unrelated session state.
- [x] E43. Full 48–112 bar arrangement is not rendered on each tweak.
- [x] E44. Preview window boundaries do not exceed generated content duration.

## F. Concurrency / race safety (planned phase)
- [x] F45. Latest generation wins.
- [x] F46. Old render completion cannot replace newer snapshot.
- [x] F47. Approval during in-flight newer render keeps explicitly approved revision.
- [x] F48. Rapid 50 regenerate clicks remain bounded.
- [x] F49. Rapid lock toggles do not corrupt selected snapshot.
- [x] F50. Close during render discards result and disposes it.
- [x] F51. Background/unmount stops playback.
- [x] F52. Two simultaneous Create events are idempotent.

## G. Audio / resource safety (planned phase)
- [x] G53. Preview output volume remains within normalized safe range.
- [x] G54. No direct 0–100 track volume is applied as raw GainNode multiplier.
- [x] G55. Blob URL registry returns to baseline after session disposal.
- [x] G56. OfflineAudioContext/resource count stays bounded over repeated variations.
- [x] G57. Playback stops before old resource is revoked.
- [x] G58. No orphan timer/debounce survives unmount.
- [x] G59. Failed render does not leak previous/new URL.
- [x] G60. Autoplay policies still require user gesture where platform requires it.

## H. Persistence / privacy / security (planned phase)
- [x] H61. No unapproved snapshot is written to ProjectStore.
- [x] H62. No unapproved snapshot is uploaded to Supabase/cloud.
- [x] H63. Telemetry excludes MIDI/audio/title/raw user content.
- [x] H64. Approval token cannot promote a snapshot from another preview session.
- [x] H65. Content hash is not used as an authorization token.
- [x] H66. Malformed imported recipe is validated before generation.
- [x] H67. Recipe schema version mismatch fails safely or migrates explicitly.

## I. Regression (planned phase)
- [x] I68. Existing Start From Scratch path still works.
- [x] I69. Existing genre/mood/details flow still works.
- [x] I70. Existing onboarding create flow still routes to Studio.
- [x] I71. Existing projectStarter tests stay green.
- [x] I72. Existing audio preview/feed tests stay green.

## Verification
- [x] Run `npx tsc --noEmit`
- [x] Run `cd backend && npx tsc --noEmit`
- [x] Run `npx vitest run`
- [x] Run `npm run test:legacy`
- [x] Run `npm run graph:ci`
- [x] Run `npm run build`
