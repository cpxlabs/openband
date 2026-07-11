import { describe, it, expect } from "vitest";
import {
  setupProjectStarter,
  regionDurationFor,
} from "../src/lib/projectStarter";
import { GENRES, TIME_SIGNATURES } from "../src/lib/projectTemplates";

describe("setupProjectStarter", () => {
  it("returns tracks matching selected genre suggestedTracks length", () => {
    const genre = GENRES.find((g) => g.id === "pop")!;
    const result = setupProjectStarter({
      name: "Test",
      genreId: "pop",
      bpm: 120,
      numBars: 8,
      timeSignature: "4/4",
      key: "C",
    });
    expect(result.tracks.length).toBe(genre.suggestedTracks.length);
  });

  it("regionDurationFor computes correct value", () => {
    expect(regionDurationFor(8, 4, 120)).toBe((8 * 4 * 60) / 120);
    expect(regionDurationFor(8, 4, 120)).toBe(16);
  });

  it("startFromScratch yields empty tracks", () => {
    const result = setupProjectStarter({
      name: "Scratch",
      genreId: "pop",
      startFromScratch: true,
    });
    expect(result.tracks).toEqual([]);
  });

  it("clamps bpm above range", () => {
    const genre = GENRES.find((g) => g.id === "lofi")!;
    const result = setupProjectStarter({
      name: "Over",
      genreId: "lofi",
      bpm: 9999,
    });
    expect(result.bpm).toBeLessThanOrEqual(genre.bpmRange[1]);
    expect(result.bpm).toBe(genre.bpmRange[1]);
  });

  it("falls back to 4/4 for invalid timeSignature", () => {
    const result = setupProjectStarter({
      name: "Bad",
      genreId: "pop",
      timeSignature: "9/9",
    });
    expect(result.timeSignature).toBe("4/4");
    expect(TIME_SIGNATURES).not.toContain("9/9");
  });
});
