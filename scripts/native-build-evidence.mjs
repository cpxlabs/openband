#!/usr/bin/env node

import { constants, accessSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VALID_TARGETS = new Set(["android", "electron"]);
const VALID_STATES = new Set(["PASS", "FAIL", "BLOCKED"]);

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function commandResult(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    status: result.status,
    text: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function gitSha() {
  const result = commandResult("git", ["rev-parse", "HEAD"]);
  return result.ok ? result.text.split(/\s+/)[0] : null;
}

function sourceSha() {
  const candidate =
    process.env.OPENBAND_SOURCE_SHA ||
    process.env.GITHUB_HEAD_SHA ||
    process.env.GITHUB_SHA ||
    gitSha();

  return /^[0-9a-f]{40}$/i.test(candidate ?? "") ? candidate : null;
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function ensureTarget(target) {
  if (!VALID_TARGETS.has(target)) {
    throw new Error(`Unsupported native build target: ${target ?? "<missing>"}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeManifest(filePath, manifest) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function packageVersion(packagePath) {
  if (!existsSync(packagePath)) {
    return null;
  }

  try {
    return readJson(packagePath).version ?? null;
  } catch {
    return null;
  }
}

function gradleDistribution() {
  const wrapperProperties = path.join(
    process.cwd(),
    "android",
    "gradle",
    "wrapper",
    "gradle-wrapper.properties",
  );

  if (!existsSync(wrapperProperties)) {
    return null;
  }

  const match = readFileSync(wrapperProperties, "utf8").match(
    /^distributionUrl=(.+)$/m,
  );
  return match?.[1]?.trim() ?? null;
}

function toolchain(target) {
  const npm = commandResult("npm", ["--version"]);
  const data = {
    node: process.version,
    npm: npm.ok ? npm.text.split(/\s+/)[0] : null,
  };

  if (target === "android") {
    const java = commandResult("java", ["-version"]);
    data.java = java.ok ? java.text.split("\n")[0] : null;
    data.gradleDistribution = gradleDistribution();
  }

  if (target === "electron") {
    data.electronBuilder = packageVersion(
      path.join(process.cwd(), "electron", "node_modules", "electron-builder", "package.json"),
    );
  }

  return data;
}

function baseManifest(target, state, reason, artifacts = [], details = {}) {
  ensureTarget(target);
  if (!VALID_STATES.has(state)) {
    throw new Error(`Unsupported evidence state: ${state}`);
  }

  return {
    schemaVersion: 1,
    target,
    state,
    commit: sourceSha(),
    checkoutCommit: gitSha(),
    reason,
    toolchain: toolchain(target),
    artifacts,
    details,
  };
}

function executable(filePath) {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function evaluatePreflight(target, cwd = process.cwd()) {
  ensureTarget(target);

  const commit =
    process.env.OPENBAND_SOURCE_SHA ||
    process.env.GITHUB_HEAD_SHA ||
    process.env.GITHUB_SHA ||
    gitSha();

  if (!/^[0-9a-f]{40}$/i.test(commit ?? "")) {
    return { ok: false, reason: "source-sha-missing" };
  }

  const npm = commandResult("npm", ["--version"]);
  if (!npm.ok) {
    return { ok: false, reason: "npm-unavailable" };
  }

  if (target === "android") {
    const gradlew = path.join(cwd, "android", "gradlew");
    const buildGradle = path.join(cwd, "android", "app", "build.gradle");

    if (!existsSync(gradlew)) {
      return { ok: false, reason: "missing-gradle-wrapper" };
    }
    if (!executable(gradlew)) {
      return { ok: false, reason: "gradle-wrapper-not-executable" };
    }
    if (!existsSync(buildGradle)) {
      return { ok: false, reason: "missing-android-build-config" };
    }

    const java = commandResult("java", ["-version"]);
    if (!java.ok) {
      return { ok: false, reason: "java-unavailable" };
    }
    if (!/\b17(?:\.|\b)/.test(java.text)) {
      return { ok: false, reason: "java-17-required" };
    }
  }

  if (target === "electron") {
    const required = [
      ["missing-root-package-lock", path.join(cwd, "package-lock.json")],
      ["missing-electron-package", path.join(cwd, "electron", "package.json")],
      ["missing-electron-package-lock", path.join(cwd, "electron", "package-lock.json")],
    ];

    for (const [reason, filePath] of required) {
      if (!existsSync(filePath)) {
        return { ok: false, reason };
      }
    }
  }

  return { ok: true, reason: "preflight-passed" };
}

function descriptor(filePath, kind) {
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Artifact is not a file: ${filePath}`);
  }

  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));

  return {
    kind,
    path: normalizePath(path.relative(process.cwd(), filePath)),
    size: stat.size,
    sha256: hash.digest("hex"),
  };
}

export function discoverArtifacts(target, cwd = process.cwd()) {
  ensureTarget(target);

  if (target === "android") {
    const directory = path.join(
      cwd,
      "android",
      "app",
      "build",
      "outputs",
      "apk",
      "release",
    );

    if (!existsSync(directory)) {
      return [];
    }

    return readdirSync(directory)
      .filter((name) => name.toLowerCase().endsWith(".apk"))
      .map((name) => descriptor(path.join(directory, name), "apk"));
  }

  const directory = path.join(cwd, "electron", "out");
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((name) => name.endsWith(".AppImage") || name.endsWith(".deb"))
    .map((name) =>
      descriptor(
        path.join(directory, name),
        name.endsWith(".AppImage") ? "appimage" : "deb",
      ),
    );
}

function requiredArtifactsPresent(target, artifacts) {
  if (target === "android") {
    return artifacts.some((artifact) => artifact.kind === "apk");
  }

  const kinds = new Set(artifacts.map((artifact) => artifact.kind));
  return kinds.has("appimage") && kinds.has("deb");
}

export function classifyEvidence({
  target,
  preflightOk,
  preflightReason = "preflight-blocked",
  buildOutcome,
  artifacts = [],
}) {
  ensureTarget(target);

  if (!preflightOk) {
    return { state: "BLOCKED", reason: preflightReason };
  }

  if (buildOutcome === "failure") {
    return { state: "FAIL", reason: "build-command-failed" };
  }

  if (buildOutcome !== "success") {
    return { state: "BLOCKED", reason: "build-not-executed" };
  }

  if (!requiredArtifactsPresent(target, artifacts)) {
    return { state: "FAIL", reason: "expected-artifact-missing" };
  }

  return {
    state: "PASS",
    reason: "build-and-artifact-validation-passed",
  };
}

export function enforceEvidence(manifest) {
  if (manifest?.state !== "PASS") {
    const state = manifest?.state ?? "MISSING";
    const reason = manifest?.reason ?? "manifest-missing";
    throw new Error(`Native build evidence rejected: ${state} (${reason})`);
  }

  return manifest;
}

function init(target, manifestPath) {
  const manifest = baseManifest(
    target,
    "BLOCKED",
    "verification-not-completed",
    [],
    { preflight: "PENDING" },
  );
  writeManifest(manifestPath, manifest);
  console.log(JSON.stringify(manifest));
}

function preflight(target, manifestPath) {
  const result = evaluatePreflight(target);
  const manifest = baseManifest(
    target,
    "BLOCKED",
    result.ok ? "build-not-run" : result.reason,
    [],
    { preflight: result.ok ? "PASS" : "BLOCKED" },
  );
  writeManifest(manifestPath, manifest);
  console.log(JSON.stringify(manifest));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

function collect(target, manifestPath, buildOutcome) {
  const previous = existsSync(manifestPath) ? readJson(manifestPath) : null;
  const preflightOk = previous?.details?.preflight === "PASS";
  const preflightReason = previous?.reason ?? "verification-not-initialized";

  let artifacts = [];
  let classification;
  let artifactError = null;

  try {
    // Always inspect any output already produced, even when a later packaging
    // phase fails. Partial artifacts remain diagnostic evidence and must be
    // hashed rather than silently omitted from a FAIL manifest.
    artifacts = discoverArtifacts(target);
    classification = classifyEvidence({
      target,
      preflightOk,
      preflightReason,
      buildOutcome,
      artifacts,
    });
  } catch (error) {
    classification = {
      state: "FAIL",
      reason: "artifact-validation-failed",
    };
    artifactError = error instanceof Error ? error.message : String(error);
  }

  const manifest = baseManifest(
    target,
    classification.state,
    classification.reason,
    artifacts,
    {
      ...(previous?.details ?? {}),
      preflight: preflightOk ? "PASS" : previous?.details?.preflight ?? "UNKNOWN",
      buildOutcome,
      ...(artifactError ? { artifactError } : {}),
    },
  );

  writeManifest(manifestPath, manifest);
  console.log(JSON.stringify(manifest));
}

function enforce(manifestPath) {
  const manifest = readJson(manifestPath);
  console.log(JSON.stringify(manifest));
  enforceEvidence(manifest);
}

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  const target = args.target;
  const manifestPath = args.manifest;

  if (command !== "enforce") {
    ensureTarget(target);
  }
  if (!manifestPath) {
    throw new Error("--manifest is required");
  }

  if (command === "init") {
    init(target, manifestPath);
    return;
  }
  if (command === "preflight") {
    preflight(target, manifestPath);
    return;
  }
  if (command === "collect") {
    collect(target, manifestPath, args["build-outcome"] ?? "skipped");
    return;
  }
  if (command === "enforce") {
    enforce(manifestPath);
    return;
  }

  throw new Error(`Unknown native build evidence command: ${command ?? "<missing>"}`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    const args = parseArgs(process.argv.slice(3));

    if (args.manifest && VALID_TARGETS.has(args.target)) {
      try {
        writeManifest(
          args.manifest,
          baseManifest(
            args.target,
            "FAIL",
            "evidence-harness-error",
            [],
            { harnessError: message },
          ),
        );
      } catch {
        // If the evidence harness itself cannot write a manifest, keep the
        // original failure as the primary signal.
      }
    }

    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 2;
  });
}
