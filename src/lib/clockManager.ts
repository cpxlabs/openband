import { Platform } from "react-native";
import { getSharedAudioContext } from "./universalAudio";

type TickListener = (time: number, audioTime: number) => void;

function createWorkerBlob(): string {
  const code = `
let intervalId = null;
self.onmessage = function(e) {
  var type = e.data.type;
  var interval = e.data.interval || 25;
  if (type === "start") {
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = setInterval(function() {
      self.postMessage({ type: "tick", time: performance.now() });
    }, interval);
  } else if (type === "stop") {
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
  } else if (type === "setInterval") {
    if (intervalId !== null) { clearInterval(intervalId); }
    intervalId = setInterval(function() {
      self.postMessage({ type: "tick", time: performance.now() });
    }, interval || 25);
  }
};
`;
  return code;
}

let workerInstance: Worker | null = null;
let isRunning = false;
const listeners = new Set<TickListener>();

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  return getSharedAudioContext();
}

export function startClock(intervalMs: number = 25): void {
  if (isRunning || Platform.OS !== "web") return;

  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const blob = new Blob([createWorkerBlob()], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    workerInstance = new Worker(url);
    URL.revokeObjectURL(url);

    workerInstance.onmessage = (e: MessageEvent<{ type: string; time: number }>) => {
      if (e.data.type === "tick") {
        const audioTime = ctx.currentTime;
        for (const listener of listeners) {
          try {
            listener(e.data.time, audioTime);
          } catch (err) {
            console.warn("Tick listener error:", err);
          }
        }
      }
    };

    workerInstance.onerror = (e) => {
      console.warn("Clock worker error:", e.message);
    };

    workerInstance.postMessage({ type: "start", interval: intervalMs });
    isRunning = true;
  } catch (e) {
    console.warn("Failed to start clock worker:", e);
  }
}

export function stopClock(): void {
  if (!isRunning) return;
  if (workerInstance) {
    workerInstance.postMessage({ type: "stop" });
    workerInstance.terminate();
    workerInstance = null;
  }
  isRunning = false;
}

export function disposeClockManager(): void {
  stopClock();
  // AudioContext lifecycle is now managed by universalAudio.dispose()
  listeners.clear();
}

export function onClockTick(listener: TickListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isClockRunning(): boolean {
  return isRunning;
}
