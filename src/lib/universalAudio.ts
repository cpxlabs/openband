import { Platform } from "react-native";
import { OpenBandNative } from "../bridge";

export interface UniversalAudioPlayer {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => void;
  getPlayer: () => unknown;
}

class UniversalAudioSystem {
  private static instance: UniversalAudioSystem;
  private isInitialized = false;
  private _audioCtx: AudioContext | null = null;

  static getInstance(): UniversalAudioSystem {
    if (!UniversalAudioSystem.instance) {
      UniversalAudioSystem.instance = new UniversalAudioSystem();
    }
    return UniversalAudioSystem.instance;
  }

  get audioCtx(): AudioContext | null {
    return this._audioCtx;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      this._audioCtx = new AudioContext();
      if (this._audioCtx.state === "suspended") {
        await this._audioCtx.resume();
      }
    }

    this.isInitialized = true;
  }

  async ensureContext(): Promise<AudioContext | null> {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    if (!this._audioCtx) await this.initialize();
    if (this._audioCtx?.state === "suspended") {
      await this._audioCtx.resume();
    }
    return this._audioCtx;
  }

  async decodeAudio(
    arrayBuffer: ArrayBuffer,
    ctx?: AudioContext,
  ): Promise<AudioBuffer> {
    const context = ctx || (await this.ensureContext());
    if (!context) throw new Error("AudioContext not available");
    return context.decodeAudioData(arrayBuffer);
  }

  async renderMixdown(
    tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[] }[],
    duration: number,
    sampleRate: number,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> {
    if (Platform.OS === "web") {
      return this.renderMixdownWeb(tracks, duration, sampleRate, onProgress);
    }
    return this.renderMixdownNative(tracks, duration, sampleRate, onProgress);
  }

  private async renderMixdownWeb(
    tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[] }[],
    duration: number,
    sampleRate: number,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> {
    const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const anySolo = tracks.some((t) => t.solo);
    const audible = tracks.filter((t) => {
      if (anySolo) return t.solo && !t.muted;
      return !t.muted;
    });

    const total = audible.reduce((s, t) => s + t.regions.length, 0);
    let processed = 0;

    for (const track of audible) {
      for (const region of track.regions) {
        if (region.url) {
          try {
            const resp = await fetch(region.url, { credentials: "omit" });
            const ab = await resp.arrayBuffer();
            const buf = await this.decodeAudio(ab);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const gain = ctx.createGain();
            gain.gain.value = track.volume / 100;
            const pan = ctx.createStereoPanner();
            pan.pan.value = track.pan / 100;
            src.connect(gain);
            gain.connect(pan);
            pan.connect(ctx.destination);
            src.start(region.start, 0, Math.min(region.duration, Math.max(0, duration - region.start)));
          } catch (e) {
            console.warn("Failed to process region:", e);
          }
        }
        processed++;
        onProgress?.(Math.round((processed / total) * 60));
      }
    }

    onProgress?.(65);
    const rendered = await ctx.startRendering();
    onProgress?.(70);
    return this.audioBufferToWavBlob(rendered, 24);
  }

  private async renderMixdownNative(
    _tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[] }[],
    _duration: number,
    _sampleRate: number,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> {
    onProgress?.(50);
    const raw = new ArrayBuffer(44);
    onProgress?.(100);
    return new Blob([raw], { type: "audio/wav" });
  }

  private audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: number): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    const ab = new ArrayBuffer(totalSize);
    const view = new DataView(ab);

    const ws = (o: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i));
    };

    ws(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    ws(8, "WAVE");
    ws(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    ws(36, "data");
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        const val = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(headerSize + (i * numChannels + ch) * bytesPerSample, val, true);
      }
    }

    return new Blob([ab], { type: "audio/wav" });
  }

  async exportToFile(blob: Blob, filename: string): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      try {
        await OpenBandNative.writeFile(filename, arrayBuffer);
      } catch (e) {
        console.warn("Bridge writeFile failed:", e);
      }
    }
  }

  async exportTone(
    duration: number,
    sampleRate: number,
    frequency: number,
  ): Promise<Blob> {
    if (Platform.OS !== "web") {
      return new Blob([new ArrayBuffer(44)], { type: "audio/wav" });
    }
    const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.3, 0.01);
    gain.gain.setValueAtTime(0.3, Math.max(0, duration - 0.1));
    gain.gain.linearRampToValueAtTime(0, duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(duration);
    const rendered = await ctx.startRendering();
    return this.audioBufferToWavBlob(rendered, 16);
  }

  dispose(): void {
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }
    this.isInitialized = false;
  }
}

export const audioSystem = UniversalAudioSystem.getInstance();
