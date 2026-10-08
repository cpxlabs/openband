# Verification — Trustworthy Native Build Verification

## Exact-head contract

Required checks: graph-check, security-policy, frontend-typecheck, backend-typecheck, vitest, legacy-tests, web-build, web-launch-e2e, android-build, electron-build, merge-gate.

## Native evidence

For Android and Electron capture exact source SHA, job conclusion, manifest state/reason/toolchain, retained evidence artifact, and produced output hashes. PASS requires build success plus required output existence.

## Scheduler matrix

| Request/scope | android-build | electron-build |
| --- | --- | --- |
| native-build | required | required |
| native-build-android only | required | not required unless independently declared/touched |
| native-build-electron only | not required unless independently declared/touched | required |
| changed android/ path | required | independent |
| changed electron/ path | independent | required |

## T4 adversarial checks

- No continue-on-error or failure-swallowing pattern in CI producer.
- A skipped unrelated native target is never interpreted as PASS.
- Target-specific labels cannot suppress a runtime job independently required by changed files or schemaVersion 2 requiredChecks.
- Privileged evaluator remains candidate-code-free and exact-head/base fail-closed.

## Recovery proof

Confirm docs/operations/merge-automation-recovery.md still provides disable/revert/audit/re-enable steps and that reverting this feature restores the previous scheduler without mutating product/runtime data.
