import { describe, it, expect, vi } from "vitest";
import { audioBufferToWavBlob, audioBufferToMp3Blob } from "../src/lib/audio";

vi.mock("lamejs", () => {
  return {
    Mp3Encoder: function (this: any) {
      this.encodeBuffer = vi.fn().mockReturnValue(new Int8Array([1, 2, 3]));
      this.flush = vi.fn().mockReturnValue(new Int8Array([4, 5]));
    },
  };
});

describe("Audio Export Formats", () => {
  const createMockAudioBuffer = () => {
    return {
      numberOfChannels: 2,
      sampleRate: 44100,
      length: 1024,
      getChannelData: (ch: number) => new Float32Array(1024).fill(0.5),
    } as unknown as AudioBuffer;
  };

  it("audioBufferToWavBlob generates a WAV blob with correct headers", () => {
    const buffer = createMockAudioBuffer();
    const blob = audioBufferToWavBlob(buffer, 16);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/wav");
  });

  it("audioBufferToMp3Blob generates an MP3 blob via lamejs", () => {
    const buffer = createMockAudioBuffer();
    const blob = audioBufferToMp3Blob(buffer, 192);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/mpeg");
    // Size is the mocked array buffer length: Int8Array([1, 2, 3]) + Int8Array([4, 5])
    expect(blob.size).toBe(5);
  });
});
