import type { TrackRegion } from "./types";

export interface EditableRegion extends TrackRegion {
  offset?: number;
  length?: number;
}

function clampMin(v: number, min: number): number {
  return v < min ? min : v;
}

function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function resolvedOffset(region: EditableRegion): number {
  return clampMin(region.offset ?? 0, 0);
}

function resolvedLength(region: EditableRegion): number {
  return clampMin(region.length ?? region.duration, 0);
}

export function trimRegion(
  region: EditableRegion,
  edge: "start" | "end",
  deltaSec: number,
  sourceDuration: number,
): EditableRegion {
  const offset = resolvedOffset(region);
  const length = resolvedLength(region);
  const maxSource = clampMin(sourceDuration, 0);

  if (edge === "start") {
    const maxDelta = length;
    const minDelta = -Math.min(offset, region.start);
    const d = clamp(deltaSec, minDelta, maxDelta);
    const newStart = clampMin(region.start + d, 0);
    const newOffset = clamp(offset + d, 0, maxSource);
    const newLength = clampMin(length - d, 0);
    return {
      ...region,
      start: newStart,
      duration: newLength,
      offset: newOffset,
      length: newLength,
    };
  }

  const maxDelta = clampMin(maxSource - offset, 0) - length;
  const minDelta = -length;
  const d = clamp(deltaSec, minDelta, maxDelta);
  const newLength = clampMin(length + d, 0);
  return {
    ...region,
    duration: newLength,
    offset,
    length: newLength,
  };
}

export function splitRegion(
  region: EditableRegion,
  atSec: number,
): [EditableRegion, EditableRegion] {
  const offset = resolvedOffset(region);
  const length = resolvedLength(region);
  const end = region.start + region.duration;
  const at = clamp(atSec, region.start, end);
  const leftDur = at - region.start;
  const rightDur = end - at;

  const left: EditableRegion = {
    ...region,
    start: region.start,
    duration: leftDur,
    offset,
    length: leftDur,
  };
  const right: EditableRegion = {
    ...region,
    id: `${region.id}-b`,
    start: at,
    duration: rightDur,
    offset: offset + leftDur,
    length: length - leftDur,
  };
  return [left, right];
}

export function moveRegion(
  region: EditableRegion,
  deltaSec: number,
): EditableRegion {
  return {
    ...region,
    start: clampMin(region.start + deltaSec, 0),
  };
}

export function crossfadeGain(a: number, b: number): [number, number] {
  const total = a + b;
  const t = total > 0 ? a / total : 0.5;
  const angle = t * (Math.PI / 2);
  return [Math.cos(angle), Math.sin(angle)];
}
