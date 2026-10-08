# Native Build Evidence Contract

## Scope

This contract defines fail-closed CI evidence for OpenBand Android and Electron build verification. It does not authorize production signing, credential management, notarization, publication, release promotion, or runtime/bridge changes.

## Evidence states

- PASS: declared toolchain is available, the build exits successfully, required outputs exist, and artifact validation completes.
- FAIL: a supported verification environment exists but dependency installation, compilation, packaging, or artifact validation fails.
- BLOCKED: verification cannot legitimately run because a declared prerequisite or supported environment capability is unavailable.
- SKIPPED is scheduling-only and is never build proof.

## Trust rules

1. Native failures are never masked or converted to success.
2. Evidence collection and uploads may run with if: always(), but the producer job remains failed when preflight/build/enforcement fails.
3. A zero exit code without the required artifact is FAIL.
4. PASS evidence binds source SHA, checkout SHA, toolchain metadata, artifact path, byte size and SHA-256.
5. Frozen dependency installation remains mandatory; mutable installs are not a remediation strategy.
6. The privileged merge evaluator must require only the native target selected by the risk-derived contract, changed runtime path, or explicit scheduling label.

## Scheduling

- native-build requests both Android and Electron and is reserved for changes whose verification contract requires both targets.
- native-build-android requests Android only.
- native-build-electron requests Electron only.
- workflow_dispatch remains a full native verification path and runs both targets.
- Changes under android/ require android-build evidence; changes under electron/ require electron-build evidence.
- A target-specific request must not make the unrelated native target a required merge check.

This target split is a coordination boundary, not a weaker gate. If a feature openband.json declares both jobs, both remain required.

## Android verification

Baseline: Linux runner, JDK 17, Node 22, executable Gradle wrapper, deterministic repository install, then ./gradlew assembleRelease. Expected proof is at least one APK under android/app/build/outputs/apk/release.

Production keystore injection and signing-policy changes are outside this contract. Android release verification may consume the repository's approved unprivileged signing boundary once #73 lands.

## Electron verification

Baseline: Linux runner, Node 22, deterministic root install and Web build, deterministic electron/npm ci, then npm run build:linux. Expected proof is both an AppImage and a Debian package under electron/out.

The committed Electron lockfile is authoritative. #104 owns lockfile reproducibility; #43 must not normalize or mutate dependency metadata during CI.

## Evidence manifest

Each requested target writes .artifacts/native-build/<target>.json with schemaVersion, target, PASS|FAIL|BLOCKED state, source/checkout SHAs, reason code, toolchain metadata, artifacts and build/preflight details. Enforcement accepts only PASS.

## T4 boundary and recovery

Native scheduling and privileged merge-evidence policy are trust-root changes and therefore T4. Adversarial verification must prove that one target cannot cause the other to become implicitly required or implicitly PASS. Recovery is to revert the scheduler/evaluator commit, disable affected automation if necessary, audit emitted evidence, and re-enable only after exact-head policy tests pass.
