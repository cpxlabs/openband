# Spec — Trustworthy Native Build Verification

## Problem

Issue #43 already hardened native build evidence, but the repository now has a verification deadlock: the shared native-build label schedules and requires both Android and Electron even when a task changes only one runtime. #104 needs Electron proof but inherits unrelated Android signing failure; #73 needs Android proof but inherited Electron lockfile failure.

## Required behavior

- Preserve fail-closed PASS|FAIL|BLOCKED native evidence with retained manifests and output artifacts.
- Add target-specific scheduling for Android and Electron while retaining native-build as the explicit both-targets path.
- Make the privileged evidence evaluator require only the target selected by changed runtime scope, declared requiredChecks, or explicit scheduling.
- Keep changed android/ files coupled to android-build and changed electron/ files coupled to electron-build.
- Keep full #43 verification capable of requiring both targets.
- Do not modify production signing secrets, publication credentials, runtime bridges, application behavior, or dependency ranges.
- Do not reintroduce the Electron lock normalizer; #104 owns deterministic lockfile repair.

## Acceptance

1. An Electron-only candidate can request electron-build without scheduling or requiring android-build.
2. An Android-only candidate can request android-build without scheduling or requiring electron-build.
3. native-build still schedules and requires both.
4. Native producer jobs remain fail-closed and produce durable evidence on failure.
5. Privileged merge automation executes trusted default-branch policy and never turns skipped/missing/failed evidence into PASS.
6. Exact-head CI, T4 policy tests, and both native jobs pass before #43 is merge-eligible.
