import { Platform } from "react-native";

export interface AudioMetrics {
  underruns: number;
  droppedFrames: number;
  cpuLoad: number;
  peakCpu: number;
  sampleRate: number;
  bufferDuration: number;
  timestamp: number;
}

export interface TelemetryConfig {
  ringBufferSize: number;
  reportIntervalMs: number;
  underrunThreshold: number;
  cpuThreshold: number;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  ringBufferSize: 60,
  reportIntervalMs: 1000,
  underrunThreshold: 5,
  cpuThreshold: 80,
};

interface RingBuffer {
  data: AudioMetrics[];
  head: number;
  count: number;
}

let ringBuffer: RingBuffer = {
  data: new Array(DEFAULT_CONFIG.ringBufferSize).fill(null),
  head: 0,
  count: 0,
};

let config = { ...DEFAULT_CONFIG };
let lastFrameTime = 0;
let frameCount = 0;
let underrunCount = 0;
let droppedFrameCount = 0;
let maxCpu = 0;
let reportCallback: ((metrics: AudioMetrics) => void) | null = null;
let reportTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

function pushToRingBuffer(metrics: AudioMetrics): void {
  ringBuffer.data[ringBuffer.head] = metrics;
  ringBuffer.head = (ringBuffer.head + 1) % config.ringBufferSize;
  if (ringBuffer.count < config.ringBufferSize) ringBuffer.count++;
}

export function getLatestMetrics(): AudioMetrics | null {
  if (ringBuffer.count === 0) return null;
  const idx = (ringBuffer.head - 1 + config.ringBufferSize) % config.ringBufferSize;
  return ringBuffer.data[idx];
}

export function getMetricsHistory(count: number = 10): AudioMetrics[] {
  const result: AudioMetrics[] = [];
  for (let i = 0; i < Math.min(count, ringBuffer.count); i++) {
    const idx = (ringBuffer.head - 1 - i + config.ringBufferSize) % config.ringBufferSize;
    result.push(ringBuffer.data[idx]);
  }
  return result;
}

export function getAverageMetrics(count: number = 10): AudioMetrics | null {
  const history = getMetricsHistory(count);
  if (history.length === 0) return null;

  const avg: AudioMetrics = {
    underruns: 0,
    droppedFrames: 0,
    cpuLoad: 0,
    peakCpu: 0,
    sampleRate: history[0].sampleRate,
    bufferDuration: history[0].bufferDuration,
    timestamp: history[0].timestamp,
  };

  for (const m of history) {
    avg.underruns += m.underruns;
    avg.droppedFrames += m.droppedFrames;
    avg.cpuLoad += m.cpuLoad;
    if (m.cpuLoad > avg.peakCpu) avg.peakCpu = m.cpuLoad;
  }

  avg.cpuLoad /= history.length;
  avg.underruns = Math.round(avg.underruns / history.length);
  avg.droppedFrames = Math.round(avg.droppedFrames / history.length);

  return avg;
}

export function recordFrame(): void {
  if (!isRunning) return;

  const now = performance.now();
  if (lastFrameTime > 0) {
    const delta = now - lastFrameTime;
    const expectedFrame = 1000 / 60;
    if (delta > expectedFrame * 1.5) {
      droppedFrameCount++;
    }
  }
  lastFrameTime = now;
  frameCount++;
}

export function recordUnderrun(): void {
  underrunCount++;
}

export function recordCpuLoad(loadPercent: number): void {
  if (loadPercent > maxCpu) maxCpu = loadPercent;
}

function collectMetrics(): AudioMetrics {
  const metrics: AudioMetrics = {
    underruns: underrunCount,
    droppedFrames: droppedFrameCount,
    cpuLoad: maxCpu,
    peakCpu: maxCpu,
    sampleRate: typeof AudioContext !== "undefined" ? 44100 : 0,
    bufferDuration: 0,
    timestamp: Date.now(),
  };

  pushToRingBuffer(metrics);

  if (reportCallback) {
    if (
      metrics.underruns > config.underrunThreshold ||
      metrics.cpuLoad > config.cpuThreshold
    ) {
      reportCallback(metrics);
    }
  }

  underrunCount = 0;
  droppedFrameCount = 0;
  maxCpu = 0;

  return metrics;
}

export function startTelemetry(
  customConfig: Partial<TelemetryConfig> = {},
  onReport?: (metrics: AudioMetrics) => void,
): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
  reportCallback = onReport ?? null;
  isRunning = true;
  lastFrameTime = 0;
  frameCount = 0;
  underrunCount = 0;
  droppedFrameCount = 0;
  maxCpu = 0;

  ringBuffer = {
    data: new Array(config.ringBufferSize).fill(null),
    head: 0,
    count: 0,
  };

  if (reportTimer) clearInterval(reportTimer);
  reportTimer = setInterval(collectMetrics, config.reportIntervalMs);
}

export function stopTelemetry(): void {
  isRunning = false;
  if (reportTimer) {
    clearInterval(reportTimer);
    reportTimer = null;
  }
}

export function getUnderrunCount(): number {
  return underrunCount;
}

export function getDroppedFrameCount(): number {
  return droppedFrameCount;
}

export function isTelemetryRunning(): boolean {
  return isRunning;
}

export function disposeTelemetry(): void {
  stopTelemetry();
  ringBuffer = {
    data: [],
    head: 0,
    count: 0,
  };
}

export async function sendTelemetryReport(
  metrics: AudioMetrics,
  serverUrl: string = "http://localhost:3001",
): Promise<boolean> {
  try {
    const url = `${serverUrl.replace(/\/+$/, "")}/api/telemetry`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metrics,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        platform: Platform.OS,
      }),
    });
    return resp.ok;
  } catch (e) {
    console.warn("Failed to send telemetry:", e);
    return false;
  }
}
