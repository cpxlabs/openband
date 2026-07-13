import { describe, it, expect } from "vitest";
import {
  serializeDawProject,
  parseDawProject,
  type DawProjectInput,
} from "../src/lib/dawproject";

describe("dawproject", () => {
  it("round-trips a 2-track project with MIDI + audio clips", () => {
    const project: DawProjectInput = {
      name: "Test Song",
      tracks: [
        {
          id: "t1",
          name: "MIDI",
          color: "#ff0000",
          muted: false,
          volume: 80,
          pan: -50,
          clips: [
            {
              id: "c1",
              start: 0,
              duration: 4,
              notes: [
                { pitch: 60, start: 0, duration: 1, velocity: 100 },
                { pitch: 64, start: 1, duration: 1, velocity: 80 },
              ],
            },
          ],
        },
        {
          id: "t2",
          name: "Audio",
          color: "#00ff00",
          volume: 60,
          pan: 100,
          clips: [
            {
              id: "c2",
              start: 2,
              duration: 8,
              audioFile: "drums.wav",
            },
          ],
        },
      ],
    };

    const xml = serializeDawProject(project);
    expect(xml).toContain("<Project>");
    expect(xml).toContain("<Tracks>");
    expect(xml).toContain("<Clips>");

    const parsed = parseDawProject(xml);
    expect(parsed).toEqual(project);
  });

  it("handles malformed XML without throwing", () => {
    const partial = parseDawProject("<Project><Tracks><Track>");
    expect(partial).toBeDefined();
    expect(Array.isArray(partial.tracks)).toBe(true);

    const empty = parseDawProject("<garbage>");
    expect(empty).toEqual({ name: "", tracks: [] });

    const truncated = parseDawProject(
      "<Project><Name>Broken</Name><Tracks><Track><Id>t1</Id>",
    );
    expect(truncated).toBeDefined();
    expect(truncated.name).toBe("Broken");
  });
});
