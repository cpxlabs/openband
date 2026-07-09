import { describe, it, expect } from "vitest";

describe("Mixer Controls", () => {
  it("computes correct audible tracks based on solo and mute states", () => {
    const tracks = [
      { id: "1", muted: false, solo: false },
      { id: "2", muted: true, solo: false },
      { id: "3", muted: false, solo: true },
    ];

    const anySolo = tracks.some(t => t.solo);
    
    const audible = tracks.filter((t) => {
      if (anySolo) return t.solo && !t.muted;
      return !t.muted;
    });

    expect(audible.length).toBe(1);
    expect(audible[0].id).toBe("3");
  });

  it("muting a soloed track makes it inaudible", () => {
    const tracks = [
      { id: "1", muted: false, solo: false },
      { id: "3", muted: true, solo: true },
    ];

    const anySolo = tracks.some(t => t.solo);
    const audible = tracks.filter((t) => {
      if (anySolo) return t.solo && !t.muted;
      return !t.muted;
    });

    expect(audible.length).toBe(0);
  });
});
