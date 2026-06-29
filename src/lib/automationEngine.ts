export type AutomationCurve = "linear" | "exponential";

export interface ScheduledAutomationPoint {
  time: number;
  value: number;
  curve: AutomationCurve;
}

export function applyAutomationToParam(
  param: AudioParam,
  points: ScheduledAutomationPoint[],
  startTime: number,
  offsetTime: number = 0,
): void {
  if (points.length === 0) return;

  param.cancelScheduledValues(startTime);

  if (points.length === 1) {
    param.setValueAtTime(points[0].value, startTime + points[0].time);
    return;
  }

  const sorted = [...points].sort((a, b) => a.time - b.time);

  param.setValueAtTime(sorted[0].value, startTime + sorted[0].time + offsetTime);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const targetTime = startTime + curr.time + offsetTime;

    if (
      curr.curve === "exponential" &&
      prev.value > 0 &&
      curr.value > 0
    ) {
      param.exponentialRampToValueAtTime(curr.value, targetTime);
    } else {
      param.linearRampToValueAtTime(curr.value, targetTime);
    }
  }
}

export function buildAutomationSchedule(
  points: ScheduledAutomationPoint[],
  bpm: number,
): ScheduledAutomationPoint[] {
  if (points.length === 0) return [];
  const beatDuration = 60 / Math.max(1, bpm);
  return points.map((p) => ({
    ...p,
    time: p.time * beatDuration,
  }));
}

export function interpolateAutomationValue(
  points: ScheduledAutomationPoint[],
  time: number,
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].value;

  const sorted = [...points].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time)
    return sorted[sorted.length - 1].value;

  let lo = 0;
  let hi = sorted.length - 1;
  while (hi - lo > 1) {
    const m = Math.floor((lo + hi) / 2);
    if (sorted[m].time <= time) lo = m;
    else hi = m;
  }

  const p0 = sorted[lo];
  const p1 = sorted[hi];
  const range = p1.time - p0.time;
  const frac = range === 0 ? 0 : (time - p0.time) / range;

  if (p1.curve === "exponential" && p0.value > 0 && p1.value > 0) {
    const ratio = p1.value / p0.value;
    return p0.value * Math.pow(ratio, frac);
  }

  return p0.value + (p1.value - p0.value) * frac;
}
