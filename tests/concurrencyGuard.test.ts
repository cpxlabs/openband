import { describe, it, expect, vi } from "vitest";
import { ConcurrencyGuard } from "../src/lib/concurrencyGuard";

const delayed = (v: number, ms = 0) => () =>
  new Promise<number>((r) => setTimeout(() => r(v), ms));

describe("▶ ConcurrencyGuard", () => {
  it("  ✔ F45 latest generation wins", async () => {
    const g = new ConcurrencyGuard<number>();
    const p1 = g.run(delayed(1, 5));
    const p2 = g.run(delayed(2, 1));
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r2.id).toBe(2);
    expect(r2.applied).toBe(true);
    expect(r1.applied).toBe(false);
    expect(r1.stale).toBe(true);
  });

  it("  ✔ F46 old render cannot replace newer", async () => {
    const g = new ConcurrencyGuard<number>();
    const p1 = g.run(delayed(1, 10));
    const p2 = g.run(delayed(2, 1));
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.applied).toBe(false);
    expect(r2.applied).toBe(true);
    expect(r1.stale).toBe(true);
  });

  it("  ✔ F47 approval keeps explicitly approved revision", async () => {
    const g = new ConcurrencyGuard<number>();
    const r1 = await g.run(delayed(1, 10));
    g.approve(r1.id);
    const r2 = await g.run(delayed(2, 1));
    expect(r1.applied).toBe(true);
    expect(r2.applied).toBe(false);
    expect(r2.stale).toBe(true);
  });

  it("  ✔ F48 rapid 50 clicks bounded", async () => {
    const g = new ConcurrencyGuard<number>();
    const promises = Array.from({ length: 50 }, (_, i) => g.run(delayed(i + 1)));
    const outcomes = await Promise.all(promises);
    expect(outcomes.filter((o) => o.applied).length).toBe(1);
  });

  it("  ✔ F49 rapid lock toggles don't corrupt selected snapshot", async () => {
    const g = new ConcurrencyGuard<number>();
    const promises: Promise<{ id: number; result: number; applied: boolean; stale: boolean }>[] = [];
    for (let i = 0; i < 20; i++) {
      promises.push(g.run(delayed(i + 1)));
      if (i % 3 === 0 && i > 0) {
        g.approve(i);
      }
    }
    const outcomes = await Promise.all(promises);
    const applied = outcomes.filter((o) => o.applied);
    const lastApproved = (g as unknown as { approvedId: number | null }).approvedId;
    if (lastApproved !== null) {
      expect(applied.length).toBe(1);
      expect(applied[0].id).toBe(lastApproved);
    } else {
      expect(applied.length).toBeLessThanOrEqual(1);
    }
    expect(g.latestId).toBe(20);
  });

  it("  ✔ F50 close during render discards + disposes", async () => {
    const onDispose = vi.fn();
    const g = new ConcurrencyGuard<number>({ onDispose });
    const p = g.run(delayed(1, 50));
    g.cancelInFlight();
    const r = await p;
    expect(r.applied).toBe(false);
    expect(r.stale).toBe(true);
    expect(onDispose).toHaveBeenCalledWith(r.id);
  });

  it("  ✔ F51 unmount stops playback", async () => {
    const onDispose = vi.fn();
    const g = new ConcurrencyGuard<number>({ onDispose });
    const p = g.run(delayed(1, 50));
    g.dispose();
    const r = await p;
    expect(r.applied).toBe(false);
    expect(onDispose).toHaveBeenCalled();
    expect(g.isDisposed).toBe(true);
  });

  it("  ✔ F52 two simultaneous Create idempotent", async () => {
    const g = new ConcurrencyGuard<string>();
    const createStub = () => () => new Promise<string>((r) => setTimeout(() => r("proj"), 0));
    const [a, b] = await Promise.all([g.run(createStub()), g.run(createStub())]);
    expect([a.applied, b.applied].filter(Boolean).length).toBe(1);
  });
});
