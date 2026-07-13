import { describe, it, expect } from "vitest";
import {
  frameCount,
  mixdownLength,
  isVideoExportSupported,
  renderVideoJob,
} from "../src/lib/videoExport";

describe("videoExport helpers", () => {
  it("frameCount computes ceil(durationSec * fps)", () => {
    expect(frameCount(10, 30)).toBe(300);
    expect(frameCount(1.5, 30)).toBe(45);
    expect(frameCount(0, 30)).toBe(0);
  });

  it("mixdownLength computes ceil(sampleRate * durationSec)", () => {
    expect(mixdownLength(44100, 1)).toBe(44100);
    expect(mixdownLength(48000, 2)).toBe(96000);
    expect(mixdownLength(44100, 0.5)).toBe(22050);
    expect(mixdownLength(96000, 0)).toBe(0);
  });

  it("isVideoExportSupported is false in the jsdom test env", () => {
    expect(isVideoExportSupported()).toBe(false);
  });

  it("renderVideoJob rejects with video-export-unsupported when unsupported", () => {
    return expect(
      renderVideoJob({ durationSec: 5, fps: 30 }),
    ).rejects.toThrow("video-export-unsupported");
  });
});
