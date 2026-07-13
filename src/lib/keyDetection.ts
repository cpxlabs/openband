import { estimatePitch, hzToNote } from "./pitchEstimate";

export interface KeyDetectionResult {
  key: number;
  scale: string;
  confidence: number;
}

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_WEIGHTS = [1, 0.16, 0.5, 0.2, 0.66, 0.28, 0.5, 0.8, 0.18, 0.6, 0.22, 0.36];
const MINOR_WEIGHTS = [1, 0.2, 0.66, 0.28, 0.5, 0.18, 0.16, 0.8, 0.22, 0.5, 0.28, 0.66];

function buildProfile(intervals: number[], weights: number[]): number[] {
  const profile = new Array(12).fill(0);
  intervals.forEach((iv, i) => {
    profile[iv] = weights[i];
  });
  return profile;
}

const MAJOR_PROFILE = buildProfile(MAJOR_INTERVALS, MAJOR_WEIGHTS);
const MINOR_PROFILE = buildProfile(MINOR_INTERVALS, MINOR_WEIGHTS);

function correlation(hist: number[], profile: number[], root: number): number {
  let score = 0;
  let total = 0;
  for (let pc = 0; pc < 12; pc++) {
    const weight = profile[(pc - root + 12) % 12];
    score += hist[pc] * weight;
    total += hist[pc];
  }
  return total > 0 ? score / total : 0;
}

export function detectKey(buffer: AudioBuffer): KeyDetectionResult {
  const histogram = new Array(12).fill(0);
  const channel =
    buffer.numberOfChannels > 0 ? buffer.getChannelData(0) : null;
  if (!channel || channel.length === 0) {
    return { key: 0, scale: "major", confidence: 0 };
  }

  const sampleRate = buffer.sampleRate || 44100;
  const frameSize = Math.min(2048, channel.length);
  const hop = Math.max(1, Math.floor(channel.length / frameSize));

  let detected = 0;
  for (let start = 0; start + frameSize <= channel.length; start += hop * frameSize) {
    const frame = channel.subarray(start, start + frameSize);
    const freq = estimatePitch(frame, sampleRate);
    if (freq === null) continue;
    const { midi } = hzToNote(freq);
    const pc = ((midi % 12) + 12) % 12;
    histogram[pc] += 1;
    detected += 1;
  }

  if (detected === 0) {
    return { key: 0, scale: "major", confidence: 0 };
  }

  let bestKey = 0;
  let bestScale = "major";
  let bestScore = -1;
  let secondBest = -1;

  for (let root = 0; root < 12; root++) {
    const major = correlation(histogram, MAJOR_PROFILE, root);
    const minor = correlation(histogram, MINOR_PROFILE, root);
    if (major > bestScore) {
      secondBest = bestScore;
      bestScore = major;
      bestKey = root;
      bestScale = "major";
    }
    if (minor > bestScore) {
      secondBest = bestScore;
      bestScore = minor;
      bestKey = root;
      bestScale = "minor";
    }
  }

  const denom = Math.max(bestScore, secondBest) || 1;
  const confidence = Math.max(0, Math.min(1, bestScore / denom));

  return { key: bestKey, scale: bestScale, confidence };
}
