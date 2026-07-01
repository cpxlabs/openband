import { Platform } from "react-native";
import { getSharedAudioContext } from "./universalAudio";

export interface PreviewAsset {
  id: string;
  name: string;
  fullUrl: string;
  thumbnailUrl: string;
  duration: number;
  sampleRate: number;
  channels: number;
  category: string;
}

export interface PreviewState {
  currentAsset: PreviewAsset | null;
  isPlaying: boolean;
  volume: number;
  bufferTime: number;
  loading: boolean;
}

let currentSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let stateCallback: ((state: PreviewState) => void) | null = null;
let currentState: PreviewState = {
  currentAsset: null,
  isPlaying: false,
  volume: 0.7,
  bufferTime: 0,
  loading: false,
};

function getPreviewContext(): AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const ctx = getSharedAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function emitState(): void {
  if (stateCallback) {
    stateCallback({ ...currentState });
  }
}

function stopCurrentPlayback(): void {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      /* already stopped */
    }
    currentSource.disconnect();
    currentSource = null;
  }
}

async function loadThumbnail(
  asset: PreviewAsset,
): Promise<AudioBuffer | null> {
  const ctx = getPreviewContext();
  if (!ctx) return null;

  try {
    const resp = await fetch(asset.thumbnailUrl);
    if (!resp.ok) return null;

    const arrayBuffer = await resp.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (e) {
    console.warn(`Failed to load preview for ${asset.name}:`, e);
    return null;
  }
}

export function previewAsset(
  asset: PreviewAsset,
  debounceMs: number = 150,
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const ctx = getPreviewContext();
    if (!ctx) return;

    stopCurrentPlayback();
    currentState = {
      ...currentState,
      currentAsset: asset,
      isPlaying: false,
      loading: true,
      bufferTime: 0,
    };
    emitState();

    const buffer = await loadThumbnail(asset);
    if (!buffer) {
      currentState = { ...currentState, loading: false };
      emitState();
      return;
    }

    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
    }
    gainNode.gain.value = currentState.volume;

    currentSource = ctx.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(gainNode);

    currentSource.onended = () => {
      currentState = { ...currentState, isPlaying: false, bufferTime: 0 };
      emitState();
    };

    try {
      currentSource.start();
      currentState = {
        ...currentState,
        isPlaying: true,
        loading: false,
        bufferTime: 0,
      };
      emitState();
    } catch (e) {
      console.warn("Preview playback failed:", e);
      currentState = { ...currentState, loading: false };
      emitState();
    }
  }, debounceMs);
}

export function stopPreview(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  stopCurrentPlayback();
  currentState = {
    ...currentState,
    currentAsset: null,
    isPlaying: false,
    bufferTime: 0,
    loading: false,
  };
  emitState();
}

export function setPreviewVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  currentState = { ...currentState, volume: clamped };
  if (gainNode) {
    gainNode.gain.value = clamped;
  }
}

export function getPreviewState(): PreviewState {
  return { ...currentState };
}

export function onPreviewStateChange(
  callback: (state: PreviewState) => void,
): () => void {
  stateCallback = callback;
  return () => {
    stateCallback = null;
  };
}

export function disposePreviewEngine(): void {
  stopPreview();
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  // AudioContext lifecycle is now managed by universalAudio.dispose()
}

export async function generateThumbnail(
  fullAudioUrl: string,
  _outputFormat: "mp3" | "ogg" = "mp3",
  durationSec: number = 2,
  _bitrate: number = 128,
): Promise<Blob | null> {
  if (Platform.OS !== "web") return null;

  const ctx = getSharedAudioContext();
  if (!ctx) return null;

  try {
    const resp = await fetch(fullAudioUrl);
    if (!resp.ok) return null;

    const arrayBuffer = await resp.arrayBuffer();
    const fullBuffer = await ctx.decodeAudioData(arrayBuffer);

    const startSample = 0;
    const endSample = Math.min(
      fullBuffer.length,
      Math.floor(durationSec * fullBuffer.sampleRate),
    );

    const thumbLength = endSample - startSample;
    const thumbBuffer = ctx.createBuffer(
      fullBuffer.numberOfChannels,
      thumbLength,
      fullBuffer.sampleRate,
    );

    for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
      const source = fullBuffer.getChannelData(ch);
      const dest = thumbBuffer.getChannelData(ch);
      for (let i = 0; i < thumbLength; i++) {
        dest[i] = source[startSample + i];
      }
    }

    const offlineCtx = new OfflineAudioContext(
      thumbBuffer.numberOfChannels,
      thumbLength,
      thumbBuffer.sampleRate,
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = thumbBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const rendered = await offlineCtx.startRendering();
    const wavBytes = audioBufferToWav(rendered);
    return new Blob([wavBytes], { type: "audio/wav" });
  } catch (e) {
    console.error("Thumbnail generation failed:", e);
    return null;
  }
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  const numSamples = channels[0].length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}
