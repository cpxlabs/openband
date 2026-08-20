# Test Plan: V10 Creative Iteration

Consolidation of `openspec/V10-test-plan.md` (sections A–I, items 1–77) into the V10 Creative Iteration OpenSpec change.

## A. Exact promotion
1. Approved snapshot music hash equals promoted project music hash.
2. Persistent ID re-key does not alter notes, timing, plugins, pan, volume or arrangement.
3. Promotion does not invoke generation again.
4. Stale unapproved render cannot replace approved snapshot.
5. UI parameter edits after approval do not silently mutate approved content.
6. Double tap Create creates one project.
7. Re-render of NewProject does not create duplicate project.
8. Closing wizard creates no project.
9. Failed persistence leaves approval state recoverable/retriable without duplicate project.
10. Preview blob URLs are not stored as durable project assets unless explicitly promoted as durable assets.

> Coverage note: A1, A2, A4, A5 are already covered by `tests/projectStarterPromotion.test.ts` via `contentHash`, `normalizedRecipe`, and `computeStale` from `src/lib/snapshotPromotion.ts`. A3, A6–A10 require the planned session/UI wiring.

## B. Seed determinism
11. Same recipe+seed+generator version => same normalized content hash.
12. Different seeds => at least one unlocked musical dimension differs.
13. Seed serialization round-trip preserves output.
14. Invalid/missing seed is normalized deterministically.
15. Generation does not read global Math.random in tested variation path.
16. Web/native normalized musical content matches for same recipe.

## C. Locks
17. Rhythm lock preserves drum event hash.
18. Bass lock preserves bass role hash.
19. Harmony lock preserves chord/harmonic event hash.
20. Melody lock preserves melody role hash.
21. FX lock preserves plugin/preset normalized hash.
22. Multiple locks compose.
23. All locks + regenerate yields equivalent musical snapshot.
24. Changing BPM with locked content follows documented transform/reject policy.
25. Changing key with locked harmony follows documented transform/reject policy.
26. Changing genre detects incompatible locks.
27. Incompatible lock is never silently discarded.

## D. Variation history
28. Default history keeps 3 snapshots.
29. Hard max keeps at most 5.
30. Selected snapshot is not evicted.
31. Eviction revokes unused preview resource.
32. Switching A/B does not regenerate content.
33. Promoting B promotes B, not latest generated C.
34. Session reset clears history safely.

## E. Arrangement preview
35. Known subgenre returns arrangement sections.
36. Representative selector chooses <= configured max windows.
37. Selected windows stay within preview budget.
38. At least one high-energy section is selected when available.
39. Low/medium contrast is selected when available.
40. No-arrangement genre falls back to short-loop preview.
41. Manual section selection plays requested section.
42. BPM/key change invalidates render cache but not unrelated session state.
43. Full 48-112 bar arrangement is not rendered on each tweak.
44. Preview window boundaries do not exceed generated content duration.

## F. Concurrency / race safety
45. Latest generation wins.
46. Old render completion cannot replace newer snapshot.
47. Approval during in-flight newer render keeps explicitly approved revision.
48. Rapid 50 regenerate clicks remain bounded.
49. Rapid lock toggles do not corrupt selected snapshot.
50. Close during render discards result and disposes it.
51. Background/unmount stops playback.
52. Two simultaneous Create events are idempotent.

## G. Audio/resource safety
53. Preview output volume remains within normalized safe range.
54. No direct 0-100 track volume is applied as raw GainNode multiplier.
55. Blob URL registry returns to baseline after session disposal.
56. OfflineAudioContext/resource count stays bounded over repeated variations.
57. Playback stops before old resource is revoked.
58. No orphan timer/debounce survives unmount.
59. Failed render does not leak previous/new URL.
60. Autoplay policies still require user gesture where platform requires it.

## H. Persistence/privacy/security
61. No unapproved snapshot is written to ProjectStore.
62. No unapproved snapshot is uploaded to Supabase/cloud.
63. Telemetry excludes MIDI/audio/title/raw user content.
64. Approval token cannot promote a snapshot from another preview session.
65. Content hash is not used as an authorization token.
66. Malformed imported recipe is validated before generation.
67. Recipe schema version mismatch fails safely or migrates explicitly.

## I. Regression
68. Existing Start From Scratch path still works.
69. Existing genre/mood/details flow still works.
70. Existing onboarding create flow still routes to Studio.
71. Existing projectStarter tests stay green.
72. Existing audio preview/feed tests stay green.
73. `tsc --noEmit` passes.
74. full Vitest passes.
75. legacy suite passes.
76. graph:ci passes.
77. production web build passes.

## Suggested stress profile
- 100 variation generations with bounded history;
- 50 rapid parameter changes;
- 20 open/close wizard cycles;
- 10 approval/create retries with injected persistence failures;
- compare resource baseline before/after each batch.
