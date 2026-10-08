# Plan — Trustworthy Native Build Verification

Tier: T4
Issue: #43
ADR: NOT REQUIRED — this changes CI/evidence trust policy, not product/runtime architecture; durable semantics live in docs/contracts/native-build-evidence.md.

## Re-analysis

The prior T3 implementation correctly produced fail-closed manifests, but repository governance evolved: CI evidence producers and privileged merge-evidence policy are now minimum T4, and the single native-build scheduler creates a cross-runtime dependency cycle across #43, #73 and #104.

## Implementation

1. Reconcile the existing #43 branch onto current master without importing stale Electron lock normalization or package metadata.
2. Reintroduce the native-build evidence harness on top of the current fail-closed CI policy with no continue-on-error.
3. Add native-build-android and native-build-electron job selectors; keep native-build as the both-target selector.
4. Update trusted evidence-merge derivation so required native jobs match the requested/changed target rather than the generic label coupling both by accident.
5. Upgrade feature metadata to schemaVersion 2 / T4 with exact required checks.
6. Add focused regression tests for classifier behavior, retained evidence, no failure swallowing, and target-specific scheduling.

## Adversarial verification

- Electron-only request: electron-build required, android-build not required unless independently declared/touched.
- Android-only request: android-build required, electron-build not required unless independently declared/touched.
- Generic native-build: both required.
- Missing/failed native job: merge gate remains blocked.
- Candidate edits to privileged workflow remain T4 and are inspected by trusted post-CI policy without executing candidate code.

## Recovery / rollback

If scheduling or evidence derivation behaves unexpectedly, keep affected PRs unmerged, revert the #43 scheduler/evaluator commit, disable evidence merge automation if necessary, audit the affected workflow run/job set, and re-enable only after policy tests and exact-head CI re-establish the trust contract.

## Out of scope

Production signing identities/secrets, publication, notarization, package identity changes, runtime/bridge changes, and unrelated product defects.
