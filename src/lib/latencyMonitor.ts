import { Platform } from "react-native";
import { getSharedAudioContext } from "./universalAudio";

export interface LatencyConfig {
  bufferDurationMs: number;
  sampleRate: number;
  latencyHint: "interactive" | "balanced" | "playback";
}

export interface MonitorState {
  enabled: boolean;
  inputVolume: number;
  monitorVolume: number;
  delayMs: number;
  trackDelays: Map<string, number>;
}

const DEFAULT_LATENCY_CONFIG: LatencyConfig = {
  bufferDurationMs: 3,
  sampleRate: 44100,
  latencyHint: "interactive",
};

let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let monitorGain: GainNode | null = null;
let monitorState: MonitorState = {
  enabled: false,
  inputVolume: 0.8,
  monitorVolume: 0.7,
  delayMs: 0,
  trackDelays: new Map(),
};

function createLowLatencyContext(
  _config: LatencyConfig = DEFAULT_LATENCY_CONFIG,
): AudioContext | null {
  if (Platform.OS !== "web" || typeof AudioContext === "undefined") return null;
  const ctx = getSharedAudioContext();
  if (ctx) return ctx;

  console.warn("Shared AudioContext not available, latency monitoring disabled");
  return null;
}

export async function requestMicrophoneAccess(): Promise<MediaStream | null> {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,

      },
    });
    return stream;
  } catch (e) {
    console.warn("Microphone access denied:", e);
    return null;
  }
}

let monitorCtx: AudioContext | null = null;

export async function startDirectMonitor(
  config: LatencyConfig = DEFAULT_LATENCY_CONFIG,
): Promise<MonitorState> {
  if (Platform.OS !== "web") return monitorState;

  const stream = await requestMicrophoneAccess();
  if (!stream) return monitorState;

  if (!monitorCtx || monitorCtx.state === "closed") {
    monitorCtx = createLowLatencyContext(config);
  }
  if (!monitorCtx) return monitorState;

  if (monitorCtx.state === "suspended") {
    await monitorCtx.resume();
  }

  sourceNode = monitorCtx.createMediaStreamSource(stream);
  mediaStream = stream;

  monitorGain = monitorCtx.createGain();
  monitorGain.gain.value = monitorState.monitorVolume;

  sourceNode.connect(monitorGain);
  monitorGain.connect(monitorCtx.destination);

  const measuredLatency = measureInputLatency(monitorCtx);
  monitorState = {
    ...monitorState,
    enabled: true,
    delayMs: measuredLatency,
  };

  return monitorState;
}

export function stopDirectMonitor(): void {
  if (monitorGain) {
    monitorGain.disconnect();
    monitorGain = null;
  }
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }
  monitorState = { ...monitorState, enabled: false };
}

export function setMonitorVolume(volume: number): void {
  monitorState = { ...monitorState, monitorVolume: Math.max(0, Math.min(1, volume)) };
  if (monitorGain) {
    monitorGain.gain.value = monitorState.monitorVolume;
  }
}

export function setInputVolume(volume: number): void {
  monitorState = { ...monitorState, inputVolume: Math.max(0, Math.min(1, volume)) };
}

export function getMonitorState(): MonitorState {
  return { ...monitorState };
}

export function measureInputLatency(ctx: AudioContext): number {
  return (ctx.outputLatency ?? 0) * 1000 + (ctx.baseLatency ?? 0) * 1000;
}

export function getLatencyCompensationDelay(): number {
  return monitorState.delayMs;
}

export function createLatencyCompensationNode(
  ctx: AudioContext,
  delayMs: number,
): DelayNode | null {
  if (delayMs <= 0) return null;

  const delay = ctx.createDelay(0.1);
  delay.delayTime.value = Math.min(0.1, delayMs / 1000);
  return delay;
}

export function applyLatencyCompensationToTrack(
  ctx: AudioContext,
  trackNode: AudioNode,
  delayMs: number,
): AudioNode {
  if (delayMs <= 0) return trackNode;

  const delay = createLatencyCompensationNode(ctx, delayMs);
  if (!delay) return trackNode;

  trackNode.connect(delay);
  return delay;
}

export function disposeLatencySystem(): void {
  stopDirectMonitor();
  if (monitorCtx && monitorCtx.state !== "closed") {
    monitorCtx.close().catch(() => {});
  }
  monitorCtx = null;
  monitorState = {
    enabled: false,
    inputVolume: 0.8,
    monitorVolume: 0.7,
    delayMs: 0,
    trackDelays: new Map(),
  };
}

export function getOptimalLatencyConfig(): LatencyConfig {
  const isMobile = Platform.OS !== "web";
  return {
    bufferDurationMs: isMobile ? 5 : 3,
    sampleRate: 44100,
    latencyHint: "interactive",
  };
}
