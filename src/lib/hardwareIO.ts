import { Platform } from "react-native";

export interface AudioDevice {
  id: string;
  kind: "audioinput" | "audiooutput";
  label: string;
  groupId: string;
  sampleRates: number[];
  channelCounts: number[];
  latency: number;
}

export interface HardwareChannel {
  deviceId: string;
  channelIndex: number;
  label: string;
  sampleRate: number;
}

export interface PatchRoute {
  id: string;
  source: HardwareChannel;
  targetTrackId: string;
  targetChannel: number;
  gain: number;
  enabled: boolean;
}

export interface PatchbayState {
  routes: PatchRoute[];
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  sampleRate: number;
  bufferSize: number;
}

let patchState: PatchbayState = {
  routes: [],
  inputDevices: [],
  outputDevices: [],
  sampleRate: 44100,
  bufferSize: 256,
};

let mediaStream: MediaStream | null = null;
let previewCtx: AudioContext | null = null;

export async function enumerateAudioDevices(): Promise<{
  inputs: AudioDevice[];
  outputs: AudioDevice[];
}> {
  if (Platform.OS !== "web" || typeof navigator === "undefined") {
    return { inputs: [], outputs: [] };
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      s.getTracks().forEach((t) => t.stop());
    });
  } catch (e) {
    console.warn("Mic permission denied for device enumeration:", e);
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs: AudioDevice[] = [];
    const outputs: AudioDevice[] = [];

    for (const device of devices) {
      if (device.kind !== "audioinput" && device.kind !== "audiooutput") continue;

      const audioDevice: AudioDevice = {
        id: device.deviceId,
        kind: device.kind as "audioinput" | "audiooutput",
        label: device.label || `${device.kind === "audioinput" ? "Input" : "Output"} ${device.deviceId.slice(0, 8)}`,
        groupId: device.groupId,
        sampleRates: [44100, 48000, 96000],
        channelCounts: [2],
        latency: 0,
      };

      if (device.kind === "audioinput") {
        inputs.push(audioDevice);
      } else {
        outputs.push(audioDevice);
      }
    }

    patchState = {
      ...patchState,
      inputDevices: inputs,
      outputDevices: outputs,
    };

    return { inputs, outputs };
  } catch (e) {
    console.error("Failed to enumerate audio devices:", e);
    return { inputs: [], outputs: [] };
  }
}

export function getHardwareChannels(
  deviceId: string,
  maxChannels: number = 32,
): HardwareChannel[] {
  const device = patchState.inputDevices.find((d) => d.id === deviceId);
  if (!device) return [];

  const channels: HardwareChannel[] = [];
  for (let i = 0; i < maxChannels; i++) {
    channels.push({
      deviceId,
      channelIndex: i,
      label: `${device.label} Ch ${i + 1}`,
      sampleRate: patchState.sampleRate,
    });
  }
  return channels;
}

export async function openHardwareInput(
  deviceId: string,
  channelCount: number = 2,
  sampleRate: number = 44100,
): Promise<MediaStream | null> {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;

  try {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: { exact: deviceId },
        channelCount: { ideal: channelCount },
        sampleRate: { ideal: sampleRate },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    return mediaStream;
  } catch (e) {
    console.error(`Failed to open hardware input ${deviceId}:`, e);
    return null;
  }
}

export function closeHardwareInput(): void {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}

export function createPatchRoute(
  source: HardwareChannel,
  targetTrackId: string,
  targetChannel: number = 0,
  gain: number = 1,
): PatchRoute {
  const route: PatchRoute = {
    id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    targetTrackId,
    targetChannel,
    gain,
    enabled: true,
  };
  patchState = {
    ...patchState,
    routes: [...patchState.routes, route],
  };
  return route;
}

export function removePatchRoute(routeId: string): void {
  patchState = {
    ...patchState,
    routes: patchState.routes.filter((r) => r.id !== routeId),
  };
}

export function updatePatchRoute(
  routeId: string,
  updates: Partial<PatchRoute>,
): void {
  patchState = {
    ...patchState,
    routes: patchState.routes.map((r) =>
      r.id === routeId ? { ...r, ...updates } : r,
    ),
  };
}

export function getRoutesForTrack(trackId: string): PatchRoute[] {
  return patchState.routes.filter((r) => r.targetTrackId === trackId);
}

export function getRoutesFromDevice(deviceId: string): PatchRoute[] {
  return patchState.routes.filter((r) => r.source.deviceId === deviceId);
}

export function getPatchbayState(): PatchbayState {
  return JSON.parse(JSON.stringify(patchState));
}

export function setSampleRate(rate: number): void {
  patchState = { ...patchState, sampleRate: rate };
}

export function setBufferSize(size: number): void {
  patchState = { ...patchState, bufferSize: size };
}

export function clearAllRoutes(): void {
  patchState = { ...patchState, routes: [] };
}

export function disposeHardwareIO(): void {
  closeHardwareInput();
  if (previewCtx) {
    previewCtx.close().catch(() => {});
    previewCtx = null;
  }
  patchState = {
    routes: [],
    inputDevices: [],
    outputDevices: [],
    sampleRate: 44100,
    bufferSize: 256,
  };
}

/**
 * Set the audio output device (sink) for the shared AudioContext.
 * Only works on Chrome 110+ web. Returns true if successful.
 */
export async function setAudioOutputDevice(deviceId: string): Promise<boolean> {
  if (Platform.OS !== "web") return false;

  const { getSharedAudioContext } = require("./universalAudio");
  const ctx = getSharedAudioContext();
  if (!ctx) return false;

  // Check for setSinkId support (Chrome 110+)
  if ("setSinkId" in ctx) {
    try {
      await (ctx as AudioContext & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
      patchState = { ...patchState, routes: patchState.routes }; // trigger state update
      return true;
    } catch (e) {
      console.warn("Failed to set audio output device:", e);
      return false;
    }
  }
  return false;
}

/**
 * Get the current output device ID. Returns empty string if default.
 */
export function getCurrentOutputDevice(): string {
  if (Platform.OS !== "web") return "";
  const { getSharedAudioContext } = require("./universalAudio");
  const ctx = getSharedAudioContext();
  if (!ctx) return "";
  return (ctx as AudioContext & { sinkId?: string }).sinkId ?? "";
}

export function createHardwareInputNode(
  stream: MediaStream,
  ctx: AudioContext,
): MediaStreamAudioSourceNode | null {
  try {
    return ctx.createMediaStreamSource(stream);
  } catch (e) {
    console.error("Failed to create hardware input node:", e);
    return null;
  }
}

export function createChannelSplitter(
  ctx: AudioContext,
  channelCount: number,
): ChannelSplitterNode {
  return new ChannelSplitterNode(ctx, { numberOfOutputs: channelCount });
}

export function createChannelMerger(
  ctx: AudioContext,
  channelCount: number,
): ChannelMergerNode {
  return new ChannelMergerNode(ctx, { numberOfInputs: channelCount });
}
