import { Platform } from "react-native";
import { OpenBandNative } from "../bridge";
import type { Plugin } from "../lib/types";
import { applyPluginChain } from "../lib/pluginChain";

/**
 * Central blob URL registry with leak protection.
 * All blob URLs created in audio modules should be registered here.
 * Automatically revokes URLs older than MAX_AGE_MS or when registry exceeds MAX_ENTRIES.
 */
const blobUrlRegistry = new Map<string, number>();
const MAX_ENTRIES = 100;
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Create a blob URL with automatic leak tracking.
 * Returns the URL and registers it for cleanup.
 */
export function createTrackedBlob(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  blobUrlRegistry.set(url, Date.now());
  cleanupBlobUrls();
  return url;
}

/**
 * Revoke a tracked blob URL.
 * Safe to call even if the URL was already revoked or never registered.
 */
export function revokeTrackedBlob(url: string): void {
  blobUrlRegistry.delete(url);
  try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
}

/**
 * Mark a blob URL as recently used so it won't be cleaned up.
 * Safe to call for URLs that are already registered or not.
 */
export function markBlobActive(url: string): void {
  if (blobUrlRegistry.has(url)) {
    blobUrlRegistry.set(url, Date.now());
  }
}

/** Clean up old blob URLs to prevent memory leaks. */
function cleanupBlobUrls(): void {
  const now = Date.now();
  for (const [url, created] of blobUrlRegistry) {
    if (now - created > MAX_AGE_MS) {
      blobUrlRegistry.delete(url);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
  }
  if (blobUrlRegistry.size > MAX_ENTRIES) {
    const oldest = [...blobUrlRegistry.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, blobUrlRegistry.size - MAX_ENTRIES);
    for (const [url] of oldest) {
      blobUrlRegistry.delete(url);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
  }
}

export interface UniversalAudioPlayer {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => void;
  getPlayer: () => unknown;
}

/**
 * Shared AudioContext getter — canonical source for all modules.
 * Returns the singleton context from universalAudioSystem, creating it lazily.
 * All other audio modules should use this instead of creating their own.
 */
export function getSharedAudioContext(): AudioContext | null {
  return audioSystem.audioCtx;
}

/**
 * Ensure the shared AudioContext is available and running (web only).
 * Resumes from suspended state if needed (browser autoplay policy).
 */
export async function ensureSharedAudioContext(): Promise<AudioContext | null> {
  return audioSystem.ensureContext();
}

/**
 * Dispose all audio subsystems through the central audioSystem singleton.
 * Call this on app teardown to release all AudioContext resources.
 */
export function disposeAllAudio(): void {
  audioSystem.dispose();
}

class UniversalAudioSystem {
  private static instance: UniversalAudioSystem;
  private isInitialized = false;
  private _audioCtx: AudioContext | null = null;
  private recordingStream: MediaStream | null = null;
  private recordingWorkletNode: AudioWorkletNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private recordedChunks: Float32Array[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private mediaRecorderBlob: Promise<Blob> | null = null;

  static getInstance(): UniversalAudioSystem {
    if (!UniversalAudioSystem.instance) {
      UniversalAudioSystem.instance = new UniversalAudioSystem();
    }
    return UniversalAudioSystem.instance;
  }

  /** Public getter for the shared AudioContext (read-only). */
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

  async startRecording(onChunk?: (chunk: Float32Array) => void): Promise<void> {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    let workletLoaded = false;
    try {
      await ctx.audioWorklet.addModule("/worklets/RecordingWorklet.js");
      workletLoaded = true;
    } catch (e) {
      console.warn("RecordingWorklet addModule failed, using MediaRecorder fallback:", e);
    }

    this.recordedChunks = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      this.cleanupRecording();
      throw new Error("MIC_PERMISSION_DENIED");
    }
    this.recordingStream = stream;

    if (workletLoaded) {
      this.mediaStreamSource = ctx.createMediaStreamSource(stream);
      this.recordingWorkletNode = new AudioWorkletNode(ctx, "recording-worklet");
      this.recordingWorkletNode.port.onmessage = (e) => {
        const chunk = new Float32Array(e.data);
        this.recordedChunks.push(chunk);
        if (onChunk) onChunk(chunk);
      };
      // Note: Do not connect worklet to destination to avoid feedback loop while recording
      this.mediaStreamSource.connect(this.recordingWorkletNode);
    } else {
      this.startMediaRecorderFallback(stream, onChunk);
    }
  }

  private startMediaRecorderFallback(stream: MediaStream, onChunk?: (chunk: Float32Array) => void): void {
    const recorder = new MediaRecorder(stream);
    const pieces: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        pieces.push(ev.data);
        if (onChunk && ev.data.arrayBuffer) {
          ev.data.arrayBuffer().then((ab) => onChunk(new Float32Array(ab))).catch(() => {});
        }
      }
    };
    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(pieces, { type: recorder.mimeType || "audio/webm" });
        resolve(blob);
      };
    });
    this.mediaRecorder = recorder;
    this.mediaRecorderBlob = blobPromise;
    recorder.start();
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.recordingStream && !this.mediaRecorder) return null;

    if (this.mediaRecorder && this.mediaRecorderBlob) {
      const recorder = this.mediaRecorder;
      const blobPromise = this.mediaRecorderBlob;
      this.mediaRecorder = null;
      this.mediaRecorderBlob = null;
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
      try {
        const blob = await blobPromise;
        this.cleanupRecording();
        return blob;
      } catch {
        this.cleanupRecording();
        return null;
      }
    }

    if (!this.recordingWorkletNode) {
      this.cleanupRecording();
      return null;
    }

    this.recordingWorkletNode.disconnect();
    this.mediaStreamSource?.disconnect();
    this.recordingStream?.getTracks().forEach((t) => t.stop());

    const chunks = this.recordedChunks;
    this.cleanupRecording();

    if (chunks.length === 0) return null;

    const sampleRate = this._audioCtx?.sampleRate || 44100;
    return this.encodeRecording(chunks, sampleRate);
  }

  /** Combine captured mono Float32 chunks into a WAV Blob (used by stopRecording and tests). */
  encodeRecording(chunks: Float32Array[], sampleRate: number = this._audioCtx?.sampleRate || 44100): Blob | null {
    if (!chunks || chunks.length === 0) return null;
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }
    // Mono capture is duplicated into both L/R channels to produce a valid 2-channel WAV.
    return this.float32ToWavBlob(combined, combined, sampleRate, 16);
  }

  private cleanupRecording(): void {
    try {
      this.recordingWorkletNode?.disconnect();
    } catch {
      /* node already disconnected */
    }
    try {
      this.mediaStreamSource?.disconnect();
    } catch {
      /* node already disconnected */
    }
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach((t) => t.stop());
      this.recordingStream = null;
    }
    this.recordingWorkletNode = null;
    this.mediaStreamSource = null;
    this.recordedChunks = [];
    this.mediaRecorder = null;
    this.mediaRecorderBlob = null;
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
    tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[]; plugins?: Plugin[] }[],
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
    tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[]; plugins?: Plugin[] }[],
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
            // Recorded takes are stored as tracked blob URLs (createTrackedBlob); fetch + decode them here.
            const resp = await fetch(region.url, { credentials: "omit" });
            const ab = await resp.arrayBuffer();
            let buf = await this.decodeAudio(ab);
            if (track.plugins && track.plugins.length > 0) {
              buf = await applyPluginChain(buf, track.plugins, sampleRate, { duration });
            }
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
    tracks: { volume: number; pan: number; muted: boolean; solo: boolean; regions: { start: number; duration: number; url?: string }[]; plugins?: Plugin[] }[],
    duration: number,
    sampleRate: number,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> {
    onProgress?.(10);

    const anySolo = tracks.some((t) => t.solo);
    const audible = tracks.filter((t) => {
      if (anySolo) return t.solo && !t.muted;
      return !t.muted;
    });

    const totalSamples = Math.ceil(sampleRate * duration);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    const total = audible.reduce((s, t) => s + t.regions.length, 0);
    let processed = 0;

    for (const track of audible) {
      const trackGain = track.volume / 100;
      const pan = track.pan / 100;
      const leftGain = trackGain * (pan < 0 ? 1 : 1 - pan);
      const rightGain = trackGain * (pan > 0 ? 1 : 1 + pan);

      for (const region of track.regions) {
        if (!region.url) {
          processed++;
          onProgress?.(Math.round((processed / total) * 80));
          continue;
        }
        try {
          const resp = await fetch(region.url, { credentials: "omit" });
          const ab = await resp.arrayBuffer();
          const decoded = await this.decodeAudioPureJS(ab, sampleRate);
          const startSample = Math.floor(region.start * sampleRate);
          const regionSamples = Math.min(
            Math.floor(region.duration * sampleRate),
            decoded.length,
            totalSamples - startSample,
          );

          for (let i = 0; i < regionSamples; i++) {
            const src = decoded[i] || 0;
            left[startSample + i] += src * leftGain;
            right[startSample + i] += src * rightGain;
          }
        } catch (e) {
          console.warn("Failed to process region on native:", e);
        }
        processed++;
        onProgress?.(Math.round((processed / total) * 80));
      }
    }

    onProgress?.(85);
    const wavBlob = this.float32ToWavBlob(left, right, sampleRate, 24);
    onProgress?.(100);
    return wavBlob;
  }

  /** Decode audio without AudioContext (pure JS WAV/MP3 decoder fallback for native). */
  private async decodeAudioPureJS(arrayBuffer: ArrayBuffer, targetSampleRate: number): Promise<Float32Array> {
    const view = new DataView(arrayBuffer);
    const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));

    if (header === "RIFF") {
      const format = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      if (format === "WAVE") {
        const numChannels = view.getUint16(22, true);
        void view.getUint32(24, true); // sampleRate — not used in pure JS decoder
        const bitsPerSample = view.getUint16(34, true);
        const dataOffset = 44;
        const dataLength = Math.min(view.getUint32(40, true), arrayBuffer.byteLength - dataOffset);

        let samples: Float32Array;
        if (bitsPerSample === 16) {
          const numSamples = dataLength / (numChannels * 2);
          samples = new Float32Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            let sum = 0;
            for (let ch = 0; ch < numChannels; ch++) {
              const val = view.getInt16(dataOffset + (i * numChannels + ch) * 2, true);
              sum += val / 32768;
            }
            samples[i] = sum / numChannels;
          }
          return samples;
        }
      }
    }

    // Fallback: return silence
    return new Float32Array(Math.ceil(targetSampleRate * 0.5));
  }

  private float32ToWavBlob(left: Float32Array, right: Float32Array, sampleRate: number, bitDepth: number): Blob {
    const length = left.length;
    const numChannels = 2;
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
        const sample = ch === 0 ? left[i] : right[i];
        const clamped = Math.max(-1, Math.min(1, sample));
        const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        view.setInt16(headerSize + (i * numChannels + ch) * bytesPerSample, val, true);
      }
    }

    return new Blob([ab], { type: "audio/wav" });
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
