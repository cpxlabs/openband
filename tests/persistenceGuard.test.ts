import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  SECRET_KEYS,
  PrivacyWipe,
  boundedHistory,
  computeProjectHash,
  isEphemeral,
  sanitizeLog,
  shouldPersist,
  validateStoredProject,
} from "../src/lib/persistenceGuard";

describe("persistenceGuard", () => {
  it("H61 preview never persisted", () => {
    assert.equal(isEphemeral("preview"), true);
    assert.equal(shouldPersist("preview"), false);
    assert.equal(shouldPersist("approved"), true);
    assert.equal(shouldPersist("lock"), true);
    assert.equal(shouldPersist("history"), true);
    assert.equal(shouldPersist("meta"), true);
  });

  it("H62 privacy wipe clears local state", () => {
    const wiped: string[] = [];
    const w = new PrivacyWipe({ onWipe: (s) => wiped.push(s) });
    w.wipeEphemeral();
    assert.deepEqual(wiped, ["ephemeral"]);
    w.wipeAll();
    assert.deepEqual(wiped, ["ephemeral", "all"]);
  });

  it("H63 approved starter integrity hash", () => {
    const p = { id: "proj-1", recipe: { genreId: "pop" }, locks: { drums: "locked" } };
    const hash = computeProjectHash(p);
    const stored = { ...p, contentHash: hash } as any;
    assert.equal(validateStoredProject(stored), true);
    stored.recipe = { genreId: "rock" };
    assert.equal(validateStoredProject(stored), false);
    const noHash = { id: "x" } as any;
    assert.equal(validateStoredProject(noHash), false);
  });

  it("H64 lock state persisted with project (no desync)", () => {
    const base = { id: "p", recipe: { g: "pop" } };
    const a = computeProjectHash({ ...base, locks: { drums: "locked" } });
    const b = computeProjectHash({ ...base, locks: { drums: "open" } });
    assert.notEqual(a, b);
    const same = computeProjectHash({ ...base, locks: { drums: "locked" } });
    assert.equal(a, same);
  });

  it("H65 bounded history storage", () => {
    assert.deepEqual(boundedHistory([1, 2, 3, 4, 5], 3), [3, 4, 5]);
    assert.deepEqual(boundedHistory([1, 2], 3), [1, 2]);
    assert.deepEqual(boundedHistory([1, 2, 3], 0), []);
    assert.deepEqual(boundedHistory([1, 2, 3], -1), []);
  });

  it("H66 no secrets in logs", () => {
    const e = {
      level: "info",
      message: "ok",
      meta: { token: "abc", userId: "u1", apiKey: "k", password: "p" },
    };
    const s = sanitizeLog(e);
    assert.equal(s.meta!.token, "[redacted]");
    assert.equal(s.meta!.apiKey, "[redacted]");
    assert.equal(s.meta!.password, "[redacted]");
    assert.equal(s.meta!.userId, "u1");
    assert.equal(e.meta.token, "abc");
    assert.ok(SECRET_KEYS.includes("token"));
    assert.ok(SECRET_KEYS.includes("authToken"));
    assert.ok(SECRET_KEYS.includes("apiKey"));
  });

  it("H67 safe unmount without partial write", () => {
    const written: any[] = [];
    const persist = (project: any) => {
      if (!shouldPersist(project.kind)) return false;
      if (!validateStoredProject(project)) throw new Error("partial-write-rejected");
      written.push(project);
      return true;
    };
    assert.equal(persist({ kind: "preview" }), false);
    const full = {
      kind: "approved",
      id: "p",
      recipe: { g: "pop" },
      contentHash: computeProjectHash({ id: "p", recipe: { g: "pop" } }),
    };
    assert.equal(persist(full), true);
    const partial = { kind: "approved", id: "p", recipe: { g: "pop" } };
    assert.throws(() => persist(partial));
    assert.equal(written.length, 1);
  });
});
