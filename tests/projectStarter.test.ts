import { describe, it, expect } from "vitest";
import {
  setupProjectStarter,
  regionDurationFor,
} from "../src/lib/projectStarter";
import { GENRES } from "../src/lib/projectTemplates";

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

  it("regionDurationFor matches (numBars*beatsPerBar*60)/bpm for 4/4", () => {
    expect(regionDurationFor(8, 4, 120)).toBe((8 * 4 * 60) / 120);
  });

  it("regionDurationFor matches (numBars*beatsPerBar*60)/bpm for 3/4", () => {
    expect(regionDurationFor(4, 3, 90)).toBe((4 * 3 * 60) / 90);
  });

  it("regionDurationFor matches (numBars*beatsPerBar*60)/bpm for 6/8", () => {
    expect(regionDurationFor(2, 6, 120)).toBe((2 * 6 * 60) / 120);
  });

  it("clamps numBars above range to 64", () => {
    const result = setupProjectStarter({ name: "Big", genreId: "pop", numBars: 200 });
    expect(result.numBars).toBe(64);
  });

  it("clamps numBars below range to 1", () => {
    const result = setupProjectStarter({ name: "Small", genreId: "pop", numBars: 0 });
    expect(result.numBars).toBe(1);
  });

  it("clamps bpm above genre range to max", () => {
    const genre = GENRES.find((g) => g.id === "pop")!;
    const result = setupProjectStarter({ name: "Fast", genreId: "pop", bpm: 999 });
    expect(result.bpm).toBe(genre.bpmRange[1]);
  });

  it("clamps bpm below genre range to min", () => {
    const genre = GENRES.find((g) => g.id === "pop")!;
    const result = setupProjectStarter({ name: "Slow", genreId: "pop", bpm: -5 });
    expect(result.bpm).toBe(genre.bpmRange[0]);
  });

  it("startFromScratch yields empty tracks with populated metadata", () => {
    const result = setupProjectStarter({
      name: "Scratch",
      genreId: "pop",
      bpm: 120,
      numBars: 16,
      timeSignature: "4/4",
      key: "C",
      startFromScratch: true,
    });
    expect(result.tracks.length).toBe(0);
    expect(result.name).toBe("Scratch");
    expect(result.bpm).toBe(120);
    expect(result.numBars).toBe(16);
    expect(result.timeSignature).toBe("4/4");
    expect(result.key).toBe("C");
    expect(result.genreId).toBe("pop");
  });

  it("pop genre produces tracks equal to suggestedTracks length", () => {
    const genre = GENRES.find((g) => g.id === "pop")!;
    const result = setupProjectStarter({
      name: "Pop",
      genreId: "pop",
      numBars: 16,
      bpm: 120,
      timeSignature: "4/4",
      key: "C",
    });
    expect(result.tracks.length).toBe(genre.suggestedTracks.length);
  });
});
