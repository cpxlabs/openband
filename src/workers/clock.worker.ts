let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent<{ type: string; interval?: number }>) => {
  const { type, interval } = e.data;

  if (type === "start") {
    if (intervalId !== null) clearInterval(intervalId);
    const ms = interval ?? 25;
    intervalId = setInterval(() => {
      self.postMessage({ type: "tick", time: performance.now() });
    }, ms);
  } else if (type === "stop") {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  } else if (type === "setInterval") {
    if (intervalId !== null) {
      clearInterval(intervalId);
      const ms = interval ?? 25;
      intervalId = setInterval(() => {
        self.postMessage({ type: "tick", time: performance.now() });
      }, ms);
    }
  }
};
