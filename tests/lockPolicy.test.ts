import { describe, it, expect } from "vitest";
import { setupProjectStarter } from "../src/lib/projectStarter";
import type { ProjectStarterResult } from "../src/lib/projectStarter";
import { normalizeTrackContent } from "../src/lib/lockPolicy";
import {
  applyLocks,
  computeRoleHashes,
  detectIncompatibleLocks,
  evaluateBpmChange,
  evaluateKeyChange,
  type LockRole,
} from "../src/lib/lockPolicy";
import { GENRES, getTrackType } from "../src/lib/projectTemplates";

function rockPrev(): ProjectStarterResult {
  return setupProjectStarter({
    name: "P",
    genreId: "rock",
    bpm: 120,
    numBars: 8,
    timeSignature: "4/4",
    key: "C",
  });
}

function rockNext(): ProjectStarterResult {
  return setupProjectStarter({
    name: "N",
    genreId: "rock",
    bpm: 120,
    numBars: 16,
    timeSignature: "4/4",
    key: "C",
  });
}

function hiphopPair(): { prev: ProjectStarterResult; next: ProjectStarterResult } {
  const prev = setupProjectStarter({
    name: "HP",
    genreId: "hiphop",
    bpm: 95,
    numBars: 8,
    timeSignature: "4/4",
    key: "C",
  });
  const next = setupProjectStarter({
    name: "HN",
    genreId: "hiphop",
    bpm: 95,
    numBars: 16,
    timeSignature: "4/4",
    key: "C",
  });
  return { prev, next };
}

function roleForTrackAt(genreId: string, index: number, trackName: string): string {
  const genre = GENRES.find((g) => g.id === genreId);
  const tt = genre?.suggestedTracks?.[index]?.trackType;
  return tt ?? getTrackType(trackName);
}

function fxTracks(result: ProjectStarterResult, genreId: string): ProjectStarterResult["tracks"] {
  return result.tracks.filter(
    (t, i) => roleForTrackAt(genreId, i, t.name) === "fx" || roleForTrackAt(genreId, i, t.name) === "sample",
  );
}

function presentRoles(genreId: string): Set<string> {
  const genre = GENRES.find((g) => g.id === genreId);
  const present = new Set<string>();
  genre?.suggestedTracks?.forEach((t) => {
    const tt = t.trackType ?? getTrackType(t.name);
    if (tt === "fx" || tt === "sample") present.add("fx");
    else if (tt === "vocal") present.add("melody");
    else present.add(tt);
  });
  return present;
}

describe("lockPolicy", () => {
  it("prev and next (rock) differ in at least one role hash", () => {
    const prev = rockPrev();
    const next = rockNext();
    const hPrev = computeRoleHashes(prev, "rock");
    const hNext = computeRoleHashes(next, "rock");
    const roles: LockRole[] = ["rhythm", "bass", "harmony", "melody", "fx"];
    expect(roles.some((r) => hPrev[r] !== hNext[r])).toBe(true);
  });

  it("C17 rhythm lock preserves rhythm hash", () => {
    const prev = rockPrev();
    const next = rockNext();
    const res = applyLocks(prev, next, { rhythm: true }, "rock");
    expect(computeRoleHashes(res, "rock").rhythm).toBe(computeRoleHashes(prev, "rock").rhythm);
  });

  it("C18 bass lock preserves bass hash", () => {
    const prev = rockPrev();
    const next = rockNext();
    const res = applyLocks(prev, next, { bass: true }, "rock");
    expect(computeRoleHashes(res, "rock").bass).toBe(computeRoleHashes(prev, "rock").bass);
  });

  it("C19 harmony lock preserves harmony hash", () => {
    const prev = rockPrev();
    const next = rockNext();
    const res = applyLocks(prev, next, { harmony: true }, "rock");
    expect(computeRoleHashes(res, "rock").harmony).toBe(computeRoleHashes(prev, "rock").harmony);
  });

  it("C20 melody lock preserves melody hash", () => {
    const prev = rockPrev();
    const next = rockNext();
    const res = applyLocks(prev, next, { melody: true }, "rock");
    expect(computeRoleHashes(res, "rock").melody).toBe(computeRoleHashes(prev, "rock").melody);
  });

  it("C21 fx lock preserves fx-role track normalized content", () => {
    const { prev, next } = hiphopPair();
    const res = applyLocks(prev, next, { fx: true }, "hiphop");
    const prevFx = fxTracks(prev, "hiphop").map(normalizeTrackContent);
    const resFx = fxTracks(res, "hiphop").map(normalizeTrackContent);
    expect(resFx).toEqual(prevFx);
  });

  it("C22 multiple locks compose (rhythm+bass preserved, others from next)", () => {
    const prev = rockPrev();
    const next = rockNext();
    const res = applyLocks(prev, next, { rhythm: true, bass: true }, "rock");
    const hRes = computeRoleHashes(res, "rock");
    const hPrev = computeRoleHashes(prev, "rock");
    const hNext = computeRoleHashes(next, "rock");
    expect(hRes.rhythm).toBe(hPrev.rhythm);
    expect(hRes.bass).toBe(hPrev.bass);
    expect(hRes.harmony).toBe(hNext.harmony);
    expect(hRes.melody).toBe(hNext.melody);
    expect(hRes.fx).toBe(hNext.fx);
  });

  it("C23 all locks => result hashes equal prev", () => {
    const prev = rockPrev();
    const next = rockNext();
    const res = applyLocks(
      prev,
      next,
      { rhythm: true, bass: true, harmony: true, melody: true, fx: true },
      "rock",
    );
    expect(computeRoleHashes(res, "rock")).toEqual(computeRoleHashes(prev, "rock"));
  });

  it("C24 bpm change invalidates rhythm but not fx", () => {
    expect(evaluateBpmChange({ rhythm: true, fx: true }, 120, 140).invalidated).toContain("rhythm");
    expect(evaluateBpmChange({ rhythm: true, fx: true }, 120, 140).invalidated).not.toContain("fx");
    expect(evaluateBpmChange({}, 120, 140).invalidated).toEqual([]);
  });

  it("C25 key change invalidates harmony but not rhythm", () => {
    expect(evaluateKeyChange({ harmony: true, rhythm: true }, "C", "G").invalidated).toContain("harmony");
    expect(evaluateKeyChange({ harmony: true, rhythm: true }, "C", "G").invalidated).not.toContain("rhythm");
  });

  it("C26 genre without fx track detects incompatible fx lock", () => {
    expect(detectIncompatibleLocks("rock", { fx: true })).toContain("fx");
  });

  it("C27 incompatible locks returned exactly (never dropped)", () => {
    const locks: Partial<Record<LockRole, boolean>> = { fx: true, melody: true };
    const genreId = "rock";
    const incompatible = detectIncompatibleLocks(genreId, locks);
    const present = presentRoles(genreId);
    const expected = (Object.keys(locks) as LockRole[]).filter(
      (r) => locks[r] && !present.has(r),
    );
    expect(incompatible.sort()).toEqual(expected.sort());
    expect(incompatible.length).toBe(expected.length);
  });
});
