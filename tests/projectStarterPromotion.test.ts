import { describe, it, expect, vi } from "vitest";
import {
  contentHash,
  computeStale,
  createPromotionGate,
  createPromotionSession,
  normalizedRecipe,
} from "../src/lib/snapshotPromotion";
import type {
  ApprovedStarterSnapshot,
  GeneratedStarterSnapshot,
  Recipe,
} from "../src/lib/snapshotPromotion";

const baseRecipe = {
  genreId: "pop",
  mood: "cheerful",
  bpm: 120,
  key: "C",
  timeSignature: "4/4",
  numBars: 8,
  seed: "s1",
} as const;

function snapshot(overrides: Partial<GeneratedStarterSnapshot> = {}): GeneratedStarterSnapshot {
  return {
    revision: 8,
    recipe: { ...baseRecipe, id: "persistent-id" } as Recipe,
    seed: "s1",
    version: "1",
    uri: "blob:preview-url",
    approved: true,
    ...overrides,
  };
}

describe("normalizedRecipe", () => {
  it("excludes transient id/uri/name so non-musical re-keying is invisible", () => {
    const a = { ...baseRecipe, id: "old-id", name: "Project A" } as Recipe;
    const b = { ...baseRecipe, id: "re-keyed-id", name: "Project B" } as Recipe;
    expect(normalizedRecipe(a)).toEqual(normalizedRecipe(b));
    expect(normalizedRecipe(a)).not.toHaveProperty("id");
    expect(normalizedRecipe(a)).not.toHaveProperty("name");
  });
});

describe("contentHash", () => {
  it("re-keying persistent IDs does not change the hash (R3 / acceptance 3)", () => {
    const a = snapshot();
    const b = snapshot({ recipe: { ...a.recipe, id: "re-keyed-id" } });
    expect(contentHash(a)).toBe(contentHash(b));
  });

  it("a musical change changes the hash", () => {
    const a = snapshot();
    const b = snapshot({ recipe: { ...a.recipe, bpm: 140 } });
    const c = snapshot({ recipe: { ...a.recipe, key: "G" } });
    expect(contentHash(a)).not.toBe(contentHash(b));
    expect(contentHash(a)).not.toBe(contentHash(c));
  });

  it("changing the version changes the hash", () => {
    const a = snapshot();
    const b = snapshot({ version: "2" });
    expect(contentHash(a)).not.toBe(contentHash(b));
  });
});

describe("computeStale (R4)", () => {
  const approved: ApprovedStarterSnapshot = {
    ...snapshot(),
    approvalToken: "token-8",
    approvedAt: 1000,
  };

  it("returns false when the active config is unchanged", () => {
    expect(computeStale({ ...baseRecipe }, approved)).toBe(false);
  });

  it("returns true when a musical param changed", () => {
    expect(computeStale({ ...baseRecipe, bpm: 140 }, approved)).toBe(true);
    expect(computeStale({ ...baseRecipe, key: "G" }, approved)).toBe(true);
  });

  it("does not flag non-musical changes (name/id) as stale", () => {
    const s = snapshot({ recipe: { ...baseRecipe, id: "x" } }) as ApprovedStarterSnapshot;
    const active = { ...baseRecipe, id: "y", name: "Renamed" } as Recipe;
    expect(computeStale(active, s)).toBe(false);
  });
});

describe("createPromotionGate (R5 / acceptance 2)", () => {
  const approved: ApprovedStarterSnapshot = {
    ...snapshot(),
    approvalToken: "token-8",
    approvedAt: 1000,
  };

  it("promotes once per approvalToken; duplicates are deduplicated", () => {
    const gate = createPromotionGate();
    const first = gate.promote(approved);
    expect(first.promoted).toBe(true);
    expect(first.projectId).toBeDefined();

    const second = gate.promote(approved);
    expect(second.promoted).toBe(false);
    expect(second.projectId).toBeUndefined();
  });

  it("does not promote for a stale snapshot", () => {
    const gate = createPromotionGate();
    const stale = { ...approved, approved: false, approvalToken: "token-8" };
    const result = gate.promote(stale as ApprovedStarterSnapshot);
    expect(result.promoted).toBe(false);
  });

  it("promotes independent approvalTokens independently", () => {
    const gate = createPromotionGate();
    const a = { ...approved, approvalToken: "tA" };
    const b = { ...approved, approvalToken: "tB" };
    expect(gate.promote(a).promoted).toBe(true);
    expect(gate.promote(b).promoted).toBe(true);
    expect(gate.promote(a).promoted).toBe(false);
  });
});

describe("createPromotionSession — A6 idempotent double promote", () => {
  it("second promote with same token is a duplicate and does not re-invoke persist", async () => {
    const session = createPromotionSession();
    const persist = vi.fn(async () => {});
    const snap: ApprovedStarterSnapshot = {
      ...snapshot(),
      approvalToken: "token-8",
      approvedAt: 1000,
    };

    const first = await session.promote(snap, { persist });
    const second = await session.promote(snap, { persist });

    expect(first).toEqual({ promoted: true, projectId: "project-token-8" });
    expect(second).toEqual({ promoted: false, reason: "duplicate" });
    expect(persist).toHaveBeenCalledTimes(1);
  });
});

describe("createPromotionSession — A3 reuse approved snapshot, no regeneration", () => {
  it("persists the normalized recipe and null preview by default", async () => {
    const session = createPromotionSession();
    const calls: Array<{ projectId: string; recipe: Recipe; previewUri: string | null }> = [];
    const persist = vi.fn(async (projectId: string, recipe: Recipe, previewUri: string | null) => {
      calls.push({ projectId, recipe, previewUri });
    });
    const snap: ApprovedStarterSnapshot = {
      ...snapshot(),
      approvalToken: "token-8",
      approvedAt: 1000,
    };

    await session.promote(snap, { persist });

    expect(calls).toHaveLength(1);
    expect(calls[0].recipe).toEqual(normalizedRecipe(snap.recipe));
    expect(calls[0].previewUri).toBeNull();
  });
});

describe("createPromotionSession — A9 failure recoverable / deferred mint", () => {
  it("a failed persist is retryable and mints exactly one project", async () => {
    const session = createPromotionSession();
    const persist = vi.fn();
    persist.mockRejectedValueOnce(new Error("boom"));
    const snap: ApprovedStarterSnapshot = {
      ...snapshot(),
      approvalToken: "token-8",
      approvedAt: 1000,
    };

    const first = await session.promote(snap, { persist });
    expect(first.promoted).toBe(false);
    if (!first.promoted) expect(first.reason).toBe("persist-failed");
    expect(session.lastError).toBeInstanceOf(Error);

    persist.mockImplementationOnce(async () => {});
    const second = await session.promote(snap, { persist });

    expect(second).toEqual({ promoted: true, projectId: "project-token-8" });
    expect(persist).toHaveBeenCalledTimes(2);
  });
});

describe("createPromotionSession — A10 preview isolation", () => {
  it("default durablePreview passes null previewUri", async () => {
    const session = createPromotionSession();
    const calls: Array<{ previewUri: string | null }> = [];
    const persist = vi.fn(async (_projectId: string, _recipe: Recipe, previewUri: string | null) => {
      calls.push({ previewUri });
    });
    const snap: ApprovedStarterSnapshot = {
      ...snapshot(),
      approvalToken: "token-8",
      approvedAt: 1000,
    };

    await session.promote(snap, { persist });

    expect(calls[0].previewUri).toBeNull();
  });

  it("durablePreview:true passes the snapshot uri", async () => {
    const session = createPromotionSession();
    const calls: Array<{ previewUri: string | null }> = [];
    const persist = vi.fn(async (_projectId: string, _recipe: Recipe, previewUri: string | null) => {
      calls.push({ previewUri });
    });
    const snap: ApprovedStarterSnapshot = {
      ...snapshot(),
      approvalToken: "token-8",
      approvedAt: 1000,
    };

    await session.promote(snap, { persist, durablePreview: true });

    expect(calls[0].previewUri).toBe(snap.uri);
  });
});
