# Tasks — Trustworthy Native Build Verification

## Re-analysis and reconciliation

- [x] Reconcile live #43/#73/#104 dependency cycle from canonical GitHub state.
- [x] Reclassify #43 to T4 because it changes CI evidence producers and privileged merge-evidence policy.
- [x] Preserve the existing PR #72 and task identity; do not open a competing workstream.
- [x] Rebase content semantically onto current master while preserving history through a merge commit.

## Implementation

- [x] Restore fail-closed native evidence harness without continue-on-error.
- [x] Keep manifest/output uploads on if: always() while preserving failing job state.
- [x] Add native-build-android and native-build-electron selectors.
- [x] Keep native-build as the explicit both-target selector.
- [x] Make privileged required-job derivation target-specific.
- [x] Remove stale Electron CI lock normalization from #43 scope.
- [x] Update durable contract and T4 Spec Kit metadata.
- [x] Add regression assertions for target-specific scheduling and fail-closed producer policy.

## Verification / closeout

- [ ] Automated design/policy validation PASS on exact HEAD.
- [ ] graph-check, security-policy, typechecks, Vitest, legacy tests, Web build/E2E and merge-gate PASS.
- [ ] android-build PASS with retained manifest/output evidence.
- [ ] electron-build PASS with retained manifest/output evidence.
- [ ] T4 privileged-evidence audit PASS.
- [ ] PR freshness/mergeability PASS against current master.
- [ ] Mark PR ready only after complete exact-head evidence is current.
