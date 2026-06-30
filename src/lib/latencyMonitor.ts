import { Platform } from "react-native";

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

let sharedCtx: AudioContext | null = null;
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
  config: LatencyConfig = DEFAULT_LATENCY_CONFIG,
): AudioContext | null {
  if (Platform.OS !== "web" || typeof AudioContext === "undefined") return null;

  try {
    const ctx = new AudioContext({
      latencyHint: config.latencyHint,
      sampleRate: config.sampleRate,
    });
    return ctx;
  } catch (e) {
    console.warn("Failed to create low-latency AudioContext:", e);
    return new AudioContext();
  }
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

export async function startDirectMonitor(
  config: LatencyConfig = DEFAULT_LATENCY_CONFIG,
): Promise<MonitorState> {
  if (Platform.OS !== "web") return monitorState;

  const stream = await requestMicrophoneAccess();
  if (!stream) return monitorState;

  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = createLowLatencyContext(config);
  }
  if (!sharedCtx) return monitorState;

  if (sharedCtx.state === "suspended") {
    await sharedCtx.resume();
  }

  sourceNode = sharedCtx.createMediaStreamSource(stream);
  mediaStream = stream;

  monitorGain = sharedCtx.createGain();
  monitorGain.gain.value = monitorState.monitorVolume;

  sourceNode.connect(monitorGain);
  monitorGain.connect(sharedCtx.destination);

  const measuredLatency = measureInputLatency(sharedCtx);
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
  if (sharedCtx && sharedCtx.state !== "closed") {
    sharedCtx.close().catch(() => {});
  }
  sharedCtx = null;
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
