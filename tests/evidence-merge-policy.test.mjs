import fs from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

describe("privileged evidence merge trust boundary", () => {
  it("does not execute candidate code or artifacts in the privileged workflow", () => {
    const workflow = read(".github/workflows/evidence-merge.yml");
    for (const forbidden of ["actions/" + "checkout", "download-" + "artifact", "pull_request" + "_target"]) {
      assert.equal(workflow.includes(forbidden), false, `privileged workflow must not contain ${forbidden}`);
    }
    for (const required of [
      "openband-security:",
      "t4-evidence:",
      "merge:",
      "pr.head.repo.full_name",
      "heads/master",
      "derivedRiskTriggers",
      "requiredChecks",
      "openband.json missing derived risk trigger",
      "contents: write",
      "pull-requests: write",
    ]) {
      assert.equal(workflow.includes(required), true, `missing ${required}`);
    }
  });

  it("does not require a manual Design Gate comment", () => {
    const workflow = read(".github/workflows/evidence-merge.yml");
    assert.equal(workflow.includes("github.rest.issues.listComments"), false);
    assert.equal(workflow.includes("const designGate"), false);
    assert.equal(workflow.includes("Design Gate decision is"), false);
    assert.equal(workflow.includes("requiredChecks differ from Design Gate contract"), false);
  });

  it("materializes the approved T4 evidence contract", () => {
    const metadata = JSON.parse(read("specs/20260917-142100-evidence-driven-merge/openband.json"));
    assert.equal(metadata.schemaVersion, 2);
    assert.equal(metadata.tier, "T4");
    assert.equal(Array.isArray(metadata.requiredChecks), true);
    assert.equal(metadata.requiredChecks.length > 0, true);
    assert.equal(metadata.riskTriggers.includes("security-sensitive-privileged-workflow"), true);
  });


  it("fails closed on deleted trust roots and candidate-controlled evidence producers", () => {
    const workflow = read(".github/workflows/evidence-merge.yml");
    assert.equal(workflow.includes("const changed = files.map((file) => file.filename);"), true);
    assert.equal(workflow.includes("filter((file) => file.status !== 'removed')"), false);
    for (const required of [
      "packageTrustTouched",
      "marketing-kb-check",
      "productRuntimeTouched",
      "architectureTouched",
      "securityPathTouched",
      "architecture-boundary-change",
      "product-runtime-change",
      "schemaV2Path",
      "current Spec Kit artifact is missing",
      "openband.json missing derived risk trigger",
      "requiredChecks",
      "continue-on-error",
      "CI evidence producer contains fail-open pattern",
      "package script ' + name + ' no longer points to trusted producer",
      "tests\\/evidence-merge-policy\\.test\\.mjs",
      "docs\\/operations\\/merge-automation-recovery\\.md",
    ]) {
      assert.equal(workflow.includes(required), true, `missing fail-closed anchor ${required}`);
    }
  });

  it("keeps PR CI unprivileged and core evidence commands exact", () => {
    const ci = read(".github/workflows/ci.yml");
    assert.equal(/(?:contents|pull-requests|checks|actions):\s*write/.test(ci), false);
    assert.equal(/continue-on-error:\s*true/.test(ci), false);
    assert.equal(/\|\|\s*(?:true|echo)\b/.test(ci), false);
    const ciRunCommands = ci
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^(?:-\s*)?run:\s*/.test(line))
      .map((line) => line.replace(/^(?:-\s*)?run:\s*/, ""));
    for (const command of [
      "npm run sdd:check",
      "npm run security:policy",
      "npm run test:marketing-kb",
      "npm run marketing:kb:check",
      "npx tsc --noEmit",
      "npx vitest run",
      "npm run test:legacy",
      "npm run build",
      "npx playwright test e2e/launch-first-run.spec.ts",
      "npm run merge:gate",
    ]) {
      assert.equal(
        ciRunCommands.includes(command),
        true,
        `missing exact CI producer ${command}`,
      );
    }
  });

  it("keeps native scheduling target-specific without weakening full native verification", () => {
    const workflow = read(".github/workflows/evidence-merge.yml");
    assert.equal(workflow.includes("native-build-android"), true);
    assert.equal(workflow.includes("native-build-electron"), true);
    assert.equal(workflow.includes("allNativeRequested = labels.has('native-build')"), true);
    assert.equal(workflow.includes("if (androidRequested) requiredJobs.add('android-build')"), true);
    assert.equal(workflow.includes("if (electronRequested) requiredJobs.add('electron-build')"), true);
  });
  it("keeps an actionable kill-switch and recovery path", () => {
    const recovery = read("docs/operations/merge-automation-recovery.md").toLowerCase();
    for (const required of ["disable", "revert", "audit", "re-enable"]) {
      assert.equal(recovery.includes(required), true, `missing recovery step ${required}`);
    }
  });
});
