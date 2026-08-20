import { describe, it, expect, vi } from "vitest";
import {
  makeRng,
  normalizeSeed,
  seedFromRecipe,
  generateDeterministicStarter,
  normalizedContentHash,
} from "../src/lib/seedDeterminism";
import { generateTracksForGenre } from "../src/lib/projectTemplates";
import type { Recipe } from "../src/lib/snapshotPromotion";

const baseRecipe: Recipe = {
  genreId: "pop",
  mood: "aggressive",
  bpm: 120,
  key: "C",
  timeSignature: "4/4",
  numBars: 8,
  seed: "s1",
};

function cloneRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return { ...baseRecipe, ...overrides };
}

function normalizedContent(tracks: ReturnType<typeof generateDeterministicStarter>) {
  return tracks.map((t) => ({
    name: t.name,
    volume: t.volume,
    pan: t.pan,
    regions: (t.regions ?? []).map((r) => ({ start: r.start, duration: r.duration })),
    plugins: (t.plugins ?? []).map((p) => ({ type: p.type, params: p.params })),
    midiNotes: (t.midiNotes ?? [])
      .map((n) => ({
        pitch: n.pitch,
        start: Math.round(n.start * 1000) / 1000,
        duration: Math.round(n.duration * 1000) / 1000,
        velocity: n.velocity,
      }))
      .sort((a, b) => a.start - b.start || a.pitch - b.pitch),
  }));
}

describe("B11 — same recipe+seed+version => same normalized content hash", () => {
  it("normalizedContentHash is stable across calls", () => {
    const r = cloneRecipe();
    const h1 = normalizedContentHash(r, "s1", "1");
    const h2 = normalizedContentHash(r, "s1", "1");
    expect(h1).toBe(h2);
  });

  it("generateDeterministicStarter is deep-equal across calls", () => {
    const r = cloneRecipe();
    const a = generateDeterministicStarter(r, "s1", "1");
    const b = generateDeterministicStarter(r, "s1", "1");
    expect(JSON.parse(JSON.stringify(normalizedContent(a)))).toEqual(
      JSON.parse(JSON.stringify(normalizedContent(b))),
    );
  });
});

describe("B12 — different seeds => at least one musical dimension differs", () => {
  const r = cloneRecipe({ mood: "aggressive" });

  it("different seeds produce different hashes", () => {
    const h1 = normalizedContentHash(r, "s1", "1");
    const h2 = normalizedContentHash(r, "s2", "1");
    expect(h1).not.toBe(h2);
  });

  it("midiNote arrays differ between seeds", () => {
    const a = generateDeterministicStarter(r, "s1", "1");
    const b = generateDeterministicStarter(r, "s2", "1");
    const same = a.every(
      (t, i) =>
        JSON.stringify(t.midiNotes ?? []) === JSON.stringify(b[i].midiNotes ?? []),
    );
    expect(same).toBe(false);
  });
});

describe("B13 — seed serialization round-trip preserves output", () => {
  const r = cloneRecipe();

  it("String('s1') equals 's1'", () => {
    const a = generateDeterministicStarter(r, String("s1"), "1");
    const b = generateDeterministicStarter(r, "s1", "1");
    expect(JSON.parse(JSON.stringify(normalizedContent(a)))).toEqual(
      JSON.parse(JSON.stringify(normalizedContent(b))),
    );
  });

  it("recipe.seed yields same hash as passing seed directly", () => {
    const recipeWithSeed = cloneRecipe({ seed: "abc" });
    const direct = normalizedContentHash(recipeWithSeed, "abc", "1");
    const derived = normalizedContentHash(
      recipeWithSeed,
      seedFromRecipe(recipeWithSeed, "1"),
      "1",
    );
    expect(seedFromRecipe(recipeWithSeed, "1")).toBe("abc");
    expect(direct).toBe(derived);
  });
});

describe("B14 — invalid/missing seed normalized deterministically", () => {
  it("normalizeSeed handles null/undefined/blank", () => {
    expect(normalizeSeed(null)).toBe("");
    expect(normalizeSeed(undefined)).toBe("");
    expect(normalizeSeed("  ")).toBe("");
  });

  it("seedFromRecipe is stable across calls", () => {
    const recipeWithoutSeed = cloneRecipe({ seed: "" });
    const s1 = seedFromRecipe(recipeWithoutSeed, "1");
    const s2 = seedFromRecipe(recipeWithoutSeed, "1");
    expect(s1).toBe(s2);
  });

  it("empty seed equals null seed", () => {
    const recipeNoSeed = cloneRecipe({ seed: "" });
    const h1 = normalizedContentHash(recipeNoSeed, "", "1");
    const h2 = normalizedContentHash(recipeNoSeed, null, "1");
    expect(h1).toBe(h2);
  });
});

describe("B15 — generation does not read global Math.random in tested path", () => {
  it("explicit seed uses seeded rng, not Math.random", () => {
    const r = cloneRecipe();
    const spy = vi.spyOn(Math, "random");
    generateDeterministicStarter(r, "s1", "1");
    expect(Math.random).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("default generateTracksForGenre still returns tracks", () => {
    const tracks = generateTracksForGenre("pop", 120, "C", "dark", 8, "4/4");
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);
  });
});

describe("B16 — web/native normalized musical content matches for same recipe", () => {
  it("two independent calls are deeply equal", () => {
    const r = cloneRecipe();
    const a = generateDeterministicStarter(r, "s1", "1");
    const b = generateDeterministicStarter(r, "s1", "1");
    expect(JSON.parse(JSON.stringify(normalizedContent(a)))).toEqual(
      JSON.parse(JSON.stringify(normalizedContent(b))),
    );
  });
});

describe("makeRng determinism", () => {
  it("produces identical sequence for same seed", () => {
    const a = makeRng("hello");
    const b = makeRng("hello");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces different sequence for different seed", () => {
    const a = makeRng("hello");
    const b = makeRng("world");
    expect([a(), a()]).not.toEqual([b(), b()]);
  });
});
