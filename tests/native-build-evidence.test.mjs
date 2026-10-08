import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyEvidence,
  discoverArtifacts,
  enforceEvidence,
} from "../scripts/native-build-evidence.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceScript = path.join(repoRoot, "scripts", "native-build-evidence.mjs");

describe("native build evidence classifier", () => {
  it("classifies a missing declared prerequisite as BLOCKED", () => {
    expect(
      classifyEvidence({
        target: "android",
        preflightOk: false,
        preflightReason: "missing-gradle-wrapper",
        buildOutcome: "skipped",
        artifacts: [],
      }),
    ).toEqual({
      state: "BLOCKED",
      reason: "missing-gradle-wrapper",
    });
  });

  it("classifies a non-zero build as FAIL", () => {
    expect(
      classifyEvidence({
        target: "android",
        preflightOk: true,
        buildOutcome: "failure",
        artifacts: [],
      }),
    ).toEqual({
      state: "FAIL",
      reason: "build-command-failed",
    });
  });

  it("classifies command success without required output as FAIL", () => {
    expect(
      classifyEvidence({
        target: "electron",
        preflightOk: true,
        buildOutcome: "success",
        artifacts: [{ kind: "appimage" }],
      }),
    ).toEqual({
      state: "FAIL",
      reason: "expected-artifact-missing",
    });
  });

  it("classifies validated Android and Electron outputs as PASS", () => {
    expect(
      classifyEvidence({
        target: "android",
        preflightOk: true,
        buildOutcome: "success",
        artifacts: [{ kind: "apk" }],
      }),
    ).toEqual({
      state: "PASS",
      reason: "build-and-artifact-validation-passed",
    });

    expect(
      classifyEvidence({
        target: "electron",
        preflightOk: true,
        buildOutcome: "success",
        artifacts: [{ kind: "appimage" }, { kind: "deb" }],
      }),
    ).toEqual({
      state: "PASS",
      reason: "build-and-artifact-validation-passed",
    });
  });

  it("hashes produced artifacts before PASS evidence is possible", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "openband-native-evidence-"));
    try {
      const output = path.join(
        temp,
        "android",
        "app",
        "build",
        "outputs",
        "apk",
        "release",
      );
      mkdirSync(output, { recursive: true });
      writeFileSync(path.join(output, "app-release.apk"), "proof", "utf8");

      const artifacts = discoverArtifacts("android", temp);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]).toMatchObject({
        kind: "apk",
        size: 5,
      });
      expect(artifacts[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("enforcement accepts PASS and rejects FAIL/BLOCKED", () => {
    expect(() =>
      enforceEvidence({ state: "PASS", reason: "ok" }),
    ).not.toThrow();

    expect(() =>
      enforceEvidence({ state: "FAIL", reason: "build-command-failed" }),
    ).toThrow(/FAIL/);

    expect(() =>
      enforceEvidence({ state: "BLOCKED", reason: "java-17-required" }),
    ).toThrow(/BLOCKED/);
  });
});

describe("native evidence manifest", () => {
  it("binds the manifest to the exact source SHA supplied by CI", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "openband-native-manifest-"));
    const manifestPath = path.join(temp, "android.json");
    const exactSha = "1234567890abcdef1234567890abcdef12345678";

    try {
      execFileSync(
        process.execPath,
        [
          evidenceScript,
          "init",
          "--target",
          "android",
          "--manifest",
          manifestPath,
        ],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            OPENBAND_SOURCE_SHA: exactSha,
          },
          stdio: "pipe",
        },
      );

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      expect(manifest.schemaVersion).toBe(1);
      expect(manifest.target).toBe("android");
      expect(manifest.state).toBe("BLOCKED");
      expect(manifest.commit).toBe(exactSha);
      expect(manifest.checkoutCommit).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});

describe("native CI workflow policy", () => {
  const workflow = readFileSync(
    path.join(repoRoot, ".github", "workflows", "ci.yml"),
    "utf8",
  );

  it("does not swallow native build failures", () => {
    expect(workflow).not.toMatch(/assembleRelease[^\n]*\|\|/);
    expect(workflow).not.toMatch(/build:linux[^\n]*\|\|/);
    expect(workflow).not.toContain("continue-on-error: true");
    expect(workflow).toContain("native-build-evidence.mjs enforce");
  });

  it("preserves explicit native scheduling", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain(
      "contains(github.event.pull_request.labels.*.name, 'native-build')",
    );
    expect(workflow).toContain(
      "contains(github.event.pull_request.labels.*.name, 'native-build-android')",
    );
    expect(workflow).toContain(
      "contains(github.event.pull_request.labels.*.name, 'native-build-electron')",
    );
  });

  it("retains machine-readable evidence and produced outputs", () => {
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain(".artifacts/native-build/android.json");
    expect(workflow).toContain(".artifacts/native-build/electron.json");
    expect(workflow).toContain("android/app/build/outputs/apk/release/*.apk");
    expect(workflow).toContain("electron/out/*.AppImage");
    expect(workflow).toContain("electron/out/*.deb");
  });
});
