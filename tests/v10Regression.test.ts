import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { makeRng } from "../src/lib/seedDeterminism";
import { createPromotionGate, contentHash, type GeneratedStarterSnapshot } from "../src/lib/snapshotPromotion";
import { roleForTrackType, detectIncompatibleLocks } from "../src/lib/lockPolicy";
import { VariationHistory } from "../src/lib/variationHistory";
import { generateArrangement, selectRepresentativeWindows } from "../src/lib/arrangementGenerator";
import { ConcurrencyGuard } from "../src/lib/concurrencyGuard";
import { AudioResourceGuard } from "../src/lib/audioResourceGuard";
import {
  computeProjectHash,
  validateStoredProject,
  sanitizeLog,
  PrivacyWipe,
} from "../src/lib/persistenceGuard";

const delayed = (v: number, ms = 0) => () => new Promise<number>((r) => setTimeout(() => r(v), ms));

function makeSnapshot(recipeContent: Record<string, unknown>, id: string): GeneratedStarterSnapshot {
  return {
    id,
    approved: true,
    approvalToken: JSON.stringify(recipeContent),
    recipe: recipeContent,
    seed: "s",
  } as unknown as GeneratedStarterSnapshot;
}

describe("V10 regression (A–H integration)", () => {
  it("A promotion exactness: different content → both promoted; same content → idempotent", async () => {
    const gate = createPromotionGate();
    const a = makeSnapshot({ genreId: "pop", bpm: 120, key: "C" }, "p1");
    const b = makeSnapshot({ genreId: "pop", bpm: 140, key: "D" }, "p2");
    const a2 = makeSnapshot({ genreId: "pop", bpm: 120, key: "C" }, "p1b");
    const r1 = gate.promote(a as any);
    const r2 = gate.promote(b as any);
    const r3 = gate.promote(a2 as any);
    assert.equal(r1.promoted, true);
    assert.equal(r2.promoted, true);
    assert.equal(r3.promoted, false);
    void contentHash;
  });

  it("B seed determinism: same seed → same sequence; different → different", () => {
    const s1 = makeRng("seed-x");
    const s2 = makeRng("seed-x");
    const s3 = makeRng("seed-y");
    const seq1 = [s1(), s1(), s1()];
    const seq2 = [s2(), s2(), s2()];
    const seq3 = [s3(), s3(), s3()];
    assert.deepEqual(seq1, seq2);
    assert.notDeepEqual(seq1, seq3);
  });

  it("C locks: role mapping + incompatible detection returns an array", () => {
    assert.equal(roleForTrackType("drums"), "rhythm");
    assert.equal(roleForTrackType("bass"), "bass");
    assert.equal(roleForTrackType("vocal"), "melody");
    const incompatible = detectIncompatibleLocks("pop", { rhythm: true });
    assert.ok(Array.isArray(incompatible));
  });

  it("D variation history: bounded + eviction revocation", () => {
    const evicted: string[] = [];
    const h = new VariationHistory({ hardMax: 3, onEvict: (e) => evicted.push(e.id) });
    for (let i = 0; i < 5; i++) h.push({ id: `v${i}`, snapshot: {} as any, previewUri: null });
    assert.equal(evicted.length, 2);
    assert.ok(h.entries.length <= 3);
    assert.ok(h.selected !== null);
  });

  it("E arrangement preview: bounded windows within content", () => {
    const arr = generateArrangement("trap");
    assert.ok(arr.length > 0);
    const wins = selectRepresentativeWindows(arr, { maxWindows: 2, previewBudgetBars: 16 });
    assert.ok(wins.length <= 2);
    for (const w of wins) assert.ok(w.bars > 0 && w.endBar > w.startBar);
  });

  it("F concurrency: latest generation wins", async () => {
    const g = new ConcurrencyGuard<number>();
    const a = g.run(delayed(1, 5));
    const b = g.run(delayed(2, 1));
    const [ra, rb] = await Promise.all([a, b]);
    assert.equal(rb.applied, true);
    assert.equal(ra.applied, false);
  });

  it("G audio: bounded simultaneous voices", () => {
    const ctx = { id: "shared", setVolume() {} } as any;
    const factory = {
      create: () => ({ play() {}, stop() {}, dispose() {} }),
    } as any;
    const g = new AudioResourceGuard({ context: ctx, factory, maxVoices: 4 });
    for (let i = 0; i < 6; i++) g.preview({});
    assert.ok(g.activeCount <= 4);
  });

  it("H persistence: integrity hash + secret-free logs + wipe", () => {
    const p = { id: "p1", recipe: { g: "pop" }, locks: { drums: "x" } };
    const hash = computeProjectHash(p);
    assert.equal(validateStoredProject({ ...p, contentHash: hash } as any), true);
    assert.equal(validateStoredProject({ ...p, contentHash: "bad" } as any), false);
    const s = sanitizeLog({ level: "info", message: "m", meta: { token: "t", userId: "u" } });
    assert.equal(s.meta!.token, "[redacted]");
    assert.equal(s.meta!.userId, "u");
    const scopes: string[] = [];
    const w = new PrivacyWipe({ onWipe: (sc) => scopes.push(sc) });
    w.wipeEphemeral();
    w.wipeAll();
    assert.deepEqual(scopes, ["ephemeral", "all"]);
  });
});
