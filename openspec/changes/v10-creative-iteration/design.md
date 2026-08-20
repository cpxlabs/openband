# Design: V10 Creative Iteration

## A. Exact promotion (FULLY SPECIFIED)

The pure core lives in `src/lib/snapshotPromotion.ts` and is covered by `tests/projectStarterPromotion.test.ts`.

- **A1. Hash equality.** `contentHash(snapshot)` serializes `version`, `seed`, and `normalizedRecipe(recipe)` and hashes them. An approved snapshot's music hash must equal the promoted project's music hash. Covered by `contentHash`.
- **A2. Re-key invariance.** `normalizedRecipe(recipe)` copies only musical keys (`genreId`, `mood`, `bpm`, `key`, `timeSignature`, `numBars`, `seed`) and excludes transient `id`, `uri`, `name`. Re-keying persistent IDs never alters notes, timing, plugins, pan, volume, or arrangement. Covered by `normalizedRecipe`.
- **A3. Promotion does not regenerate.** NEW session/UI wiring in `src/components/NewProject.tsx` + `src/lib/projectStarter.ts`: the Create action must call a promotion path that invokes the gate and reuses the already-approved snapshot rather than re-invoking generation. To be created.
- **A4. Stale rejection.** `computeStale(activeConfig, approved)` compares normalized recipes and returns true when a musical param changed. A stale unapproved render cannot replace an approved snapshot. Covered by `computeStale`.
- **A5. Non-musical-edit immunity.** `normalizedRecipe` + `computeStale` ensure post-approval UI parameter edits that are transient (name/id) do not silently mutate approved content. Covered.
- **A6. Double-tap idempotency.** `createPromotionGate()` returns a `promote()` that deduplicates by `approvalToken` and returns `promoted:false` on repeat. NEW wiring makes the Create handler route through a single per-session gate so a double tap creates exactly one project. To be created.
- **A7. No re-render duplicate.** NEW: `src/components/NewProject.tsx` must not re-run promotion on re-render; gate instance must be stable across renders (ref/memo), not recreated per render.
- **A8. Closing creates none.** NEW: wizard dismissal must not call promotion; only an explicit Create does.
- **A9. Failure recovery.** NEW: if persistence fails, the gate must remain minted-free (not mark the token used) so retry is possible without a duplicate project; the approval state is recoverable/retriable.
- **A10. Preview blob isolation.** NEW: preview blob URLs are session-scoped and must not be written into durable project assets unless explicitly promoted as durable assets via the promotion path.

`createPromotionGate` is the dedup/idempotency primitive for A3/A6/A7/A9.

## B. Seed determinism
- Module to be created: `src/lib/seedDeterminism.ts` (or extend `projectStarter.ts`) — canonical seed serialization/normalization and a versioned deterministic generator entry.
- Ensure all variation paths derive randomness from the recipe seed, never global `Math.random`, in tested paths.
- Web/native normalized musical content must match for the same recipe.

## C. Locks
- Module to be created: `src/lib/lockPolicy.ts` — per-role lock primitives (rhythm, bass, harmony, melody, FX) preserving normalized role hashes.
- Documented transform/reject policy for BPM/key changes against locked content; incompatible lock detection on genre change must never silently discard locks.

## D. Variation history
- Module to be created: `src/lib/variationHistory.ts` — bounded ring (default 3, hard max 5), selected-snapshot pinning, eviction-time preview resource revocation, A/B switch without regeneration, safe session reset.

## E. Arrangement preview
- `src/lib/arrangementGenerator.ts` already provides `generateArrangement`, `getTotalBars`, and `unknown → []` fallback.
- Missing (to be created/extended): representative window selector bounded by a configured max windows and preview budget; high-energy/contrast selection; manual section playback; render cache invalidation on BPM/key change; guard that the full 48–112 bar arrangement is never rendered on each tweak; window boundary clamping to generated content duration.

## F. Concurrency / race safety
- Module to be created: `src/lib/concurrencyGuard.ts` — latest-wins generation ordering, stale-render rejection, approval-keeps-explicit-revision, bounded rapid-click handling, safe close-during-render disposal, unmount playback stop, idempotent simultaneous Create.

## G. Audio / resource safety
- Module to be created (or extend `src/lib/universalAudio.ts`): normalized safe preview volume, no raw 0–100 → GainNode multiplier, blob URL registry baseline return after disposal, bounded OfflineAudioContext/resource counts, stop-before-revoke, no orphan timers/debounce after unmount, no URL leak on failed render, preservation of platform autoplay gesture requirements.

## H. Persistence / privacy / security
- Module to be created: `src/lib/persistenceGuard.ts` — no unapproved snapshot written to ProjectStore or uploaded to Supabase/cloud; telemetry excludes MIDI/audio/title/raw user content; approval token scoped to its preview session; content hash never used as auth token; malformed/imported recipe validation before generation; recipe schema version mismatch fails safely or migrates explicitly.

## I. Regression
- No new module; verification gates only. Must confirm existing Start From Scratch, genre/mood/details, onboarding→Studio routing, and all existing test suites (projectStarter, audio preview/feed) stay green alongside the standard build matrix.
