import { describe, it, expect } from "vitest";

describe("Audio Recording State", () => {
  it("arms a track correctly", () => {
    const track = { id: "track-1", isArmed: false };
    const toggleArm = (t: any) => ({ ...t, isArmed: !t.isArmed });
    const armedTrack = toggleArm(track);
    expect(armedTrack.isArmed).toBe(true);
  });

  it("adds a recorded region to an armed track", () => {
    let track = { id: "track-1", isArmed: true, regions: [] as any[] };
    const uri = "blob:http://localhost/123";
    const duration = 5;

    if (track.isArmed) {
      track.regions.push({
        id: "region-1",
        start: 0,
        duration,
        url: uri,
      });
    }

    expect(track.regions.length).toBe(1);
    expect(track.regions[0].url).toBe(uri);
    expect(track.regions[0].duration).toBe(duration);
  });
});
