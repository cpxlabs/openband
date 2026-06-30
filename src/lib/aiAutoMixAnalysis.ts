export interface StemAnalysis {
  trackId: string;
  trackName: string;
  role: "kick" | "snare" | "hihat" | "bass" | "vocal" | "lead" | "pad" | "keys" | "guitar" | "fx" | "other";
  lufs: number;
  peakDb: number;
  dynamicRange: number;
  spectralBalance: {
    low: number;
    mid: number;
    high: number;
  };
  transientDensity: number;
  stereoWidth: number;
  rmsLevel: number;
  crestFactor: number;
}

export interface AutoMixSuggestion {
  trackId: string;
  trackName: string;
  role: string;
  volume: number;
  pan: number;
  eq: { frequency: number; gain: number; Q: number }[];
  compression: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  reasoning: string;
}

export interface AutoMixResult {
  suggestions: AutoMixSuggestion[];
  masterSuggestion: {
    targetLufs: number;
    targetPeak: number;
    masterEQ: { frequency: number; gain: number }[];
  };
  analysis: StemAnalysis[];
}

function detectRole(name: string, analysis: StemAnalysis): StemAnalysis["role"] {
  const lower = name.toLowerCase();

  if (lower.includes("kick") || lower.includes("drum") && lower.includes("low")) return "kick";
  if (lower.includes("snare") || lower.includes("clap")) return "snare";
  if (lower.includes("hihat") || lower.includes("hi-hat") || lower.includes("hat")) return "hihat";
  if (lower.includes("bass") || lower.includes("sub")) return "bass";
  if (lower.includes("vocal") || lower.includes("vox") || lower.includes("voice")) return "vocal";
  if (lower.includes("lead") || lower.includes("melody")) return "lead";
  if (lower.includes("pad") || lower.includes("ambient")) return "pad";
  if (lower.includes("keys") || lower.includes("piano") || lower.includes("rhodes")) return "keys";
  if (lower.includes("guitar") || lower.includes("gtr") || lower.includes("strum")) return "guitar";
  if (lower.includes("fx") || lower.includes("effect") || lower.includes("riser")) return "fx";

  if (analysis.spectralBalance.low > 0.5 && analysis.transientDensity > 0.3) return "kick";
  if (analysis.spectralBalance.high > 0.6 && analysis.transientDensity > 0.5) return "hihat";
  if (analysis.spectralBalance.low > 0.4 && analysis.spectralBalance.mid < 0.3) return "bass";
  if (analysis.spectralBalance.mid > 0.5 && analysis.dynamicRange > 10) return "vocal";

  return "other";
}

export function analyzeBuffer(
  buffer: AudioBuffer,
  trackId: string,
  trackName: string,
): StemAnalysis {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const length = channelData.length;

  let sumSquares = 0;
  let peak = 0;

  for (let i = 0; i < length; i++) {
    const sample = Math.abs(channelData[i]);
    sumSquares += channelData[i] * channelData[i];
    if (sample > peak) peak = sample;
  }

  const rms = Math.sqrt(sumSquares / length);
  const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10));
  const peakDb = 20 * Math.log10(Math.max(peak, 1e-10));

  const blockSize = Math.floor(sampleRate * 0.02);
  const blockCount = Math.floor(length / blockSize);
  const blockEnergies: number[] = [];

  for (let b = 0; b < blockCount; b++) {
    let blockSum = 0;
    for (let i = 0; i < blockSize; i++) {
      const idx = b * blockSize + i;
      if (idx < length) {
        blockSum += channelData[idx] * channelData[idx];
      }
    }
    blockEnergies.push(Math.sqrt(blockSum / blockSize));
  }

  let transientCount = 0;
  for (let b = 1; b < blockEnergies.length; b++) {
    if (blockEnergies[b] > blockEnergies[b - 1] * 2) {
      transientCount++;
    }
  }
  const transientDensity = blockCount > 0 ? transientCount / blockCount : 0;

  const fftSize = 2048;
  const numFrames = Math.floor(length / fftSize);
  const lowEnergy = { sum: 0, count: 0 };
  const midEnergy = { sum: 0, count: 0 };
  const highEnergy = { sum: 0, count: 0 };

  for (let f = 0; f < Math.min(numFrames, 100); f++) {
    let low = 0, mid = 0, high = 0;
    const start = f * fftSize;

    for (let k = 0; k < fftSize / 2; k++) {
      const sample = channelData[start + k] || 0;
      const freq = (k * sampleRate) / fftSize;
      const energy = sample * sample;

      if (freq < 300) low += energy;
      else if (freq < 4000) mid += energy;
      else high += energy;
    }

    lowEnergy.sum += low;
    midEnergy.sum += mid;
    highEnergy.sum += high;
    lowEnergy.count++;
    midEnergy.count++;
    highEnergy.count++;
  }

  const totalEnergy = lowEnergy.sum + midEnergy.sum + highEnergy.sum;
  const spectralBalance = {
    low: totalEnergy > 0 ? lowEnergy.sum / totalEnergy : 0.33,
    mid: totalEnergy > 0 ? midEnergy.sum / totalEnergy : 0.34,
    high: totalEnergy > 0 ? highEnergy.sum / totalEnergy : 0.33,
  };

  const dynamicRange = peakDb - rmsDb;
  const crestFactor = peak > 0 ? 20 * Math.log10(peak / Math.max(rms, 1e-10)) : 0;

  let stereoWidth = 0;
  if (buffer.numberOfChannels >= 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    let correlation = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    const sampleCount = Math.min(left.length, right.length, 44100 * 10);

    for (let i = 0; i < sampleCount; i += 100) {
      correlation += left[i] * right[i];
      leftEnergy += left[i] * left[i];
      rightEnergy += right[i] * right[i];
    }

    const denom = Math.sqrt(leftEnergy * rightEnergy);
    stereoWidth = denom > 0 ? 1 - Math.abs(correlation / denom) : 0;
  }

  const analysis: StemAnalysis = {
    trackId,
    trackName,
    role: "other",
    lufs: rmsDb - 0.691,
    peakDb,
    dynamicRange,
    spectralBalance,
    transientDensity,
    stereoWidth,
    rmsLevel: rmsDb,
    crestFactor,
  };

  analysis.role = detectRole(trackName, analysis);
  return analysis;
}

function suggestForRole(
  analysis: StemAnalysis,
  allAnalysis: StemAnalysis[],
): AutoMixSuggestion {
  const roleConfigs: Record<string, {
    targetLufs: number;
    panPreference: number;
    eqBoost: { frequency: number; gain: number; Q: number }[];
    compression: { threshold: number; ratio: number; attack: number; release: number };
  }> = {
    kick: {
      targetLufs: -8,
      panPreference: 0,
      eqBoost: [
        { frequency: 60, gain: 3, Q: 1 },
        { frequency: 4000, gain: 2, Q: 2 },
      ],
      compression: { threshold: -18, ratio: 4, attack: 0.003, release: 0.1 },
    },
    snare: {
      targetLufs: -10,
      panPreference: 0,
      eqBoost: [
        { frequency: 200, gain: 2, Q: 1.5 },
        { frequency: 5000, gain: 3, Q: 2 },
      ],
      compression: { threshold: -16, ratio: 3, attack: 0.005, release: 0.08 },
    },
    hihat: {
      targetLufs: -14,
      panPreference: 0.3,
      eqBoost: [
        { frequency: 8000, gain: 2, Q: 1 },
      ],
      compression: { threshold: -20, ratio: 2, attack: 0.001, release: 0.05 },
    },
    bass: {
      targetLufs: -10,
      panPreference: 0,
      eqBoost: [
        { frequency: 80, gain: 4, Q: 1 },
        { frequency: 800, gain: -2, Q: 1.5 },
      ],
      compression: { threshold: -14, ratio: 6, attack: 0.005, release: 0.15 },
    },
    vocal: {
      targetLufs: -12,
      panPreference: 0,
      eqBoost: [
        { frequency: 3000, gain: 2, Q: 1.5 },
        { frequency: 8000, gain: 1, Q: 1 },
      ],
      compression: { threshold: -18, ratio: 3, attack: 0.01, release: 0.1 },
    },
    lead: {
      targetLufs: -12,
      panPreference: 0.2,
      eqBoost: [
        { frequency: 2500, gain: 2, Q: 1.5 },
      ],
      compression: { threshold: -16, ratio: 3, attack: 0.01, release: 0.1 },
    },
    pad: {
      targetLufs: -16,
      panPreference: 0.4,
      eqBoost: [],
      compression: { threshold: -22, ratio: 2, attack: 0.05, release: 0.3 },
    },
    keys: {
      targetLufs: -14,
      panPreference: 0.25,
      eqBoost: [
        { frequency: 1500, gain: 1, Q: 1 },
      ],
      compression: { threshold: -18, ratio: 2.5, attack: 0.01, release: 0.12 },
    },
    guitar: {
      targetLufs: -13,
      panPreference: 0.35,
      eqBoost: [
        { frequency: 2000, gain: 2, Q: 1.5 },
        { frequency: 6000, gain: 1, Q: 1 },
      ],
      compression: { threshold: -16, ratio: 3, attack: 0.005, release: 0.1 },
    },
    fx: {
      targetLufs: -18,
      panPreference: 0.5,
      eqBoost: [],
      compression: { threshold: -20, ratio: 2, attack: 0.01, release: 0.2 },
    },
  };

  const config = roleConfigs[analysis.role] ?? roleConfigs.other;
  const volumeRatio = Math.pow(10, (config.targetLufs - analysis.lufs) / 20);
  const volume = Math.max(0, Math.min(1, volumeRatio));

  const sameRoleTracks = allAnalysis.filter((a) => a.role === analysis.role && a.trackId !== analysis.trackId);
  let pan = config.panPreference;
  if (sameRoleTracks.length > 0) {
    const spread = 0.8 / (sameRoleTracks.length + 1);
    pan = -0.4 + spread * (sameRoleTracks.findIndex((a) => a.trackId === analysis.trackId) + 1);
  }

  const eq = config.eqBoost.map((e) => {
    const targetGain = e.gain;
    const currentImbalance = analysis.spectralBalance.mid - 0.33;
    return {
      frequency: e.frequency,
      gain: targetGain * (1 + currentImbalance),
      Q: e.Q,
    };
  });

  const compThreshold = config.compression.threshold;

  return {
    trackId: analysis.trackId,
    trackName: analysis.trackName,
    role: analysis.role,
    volume,
    pan,
    eq,
    compression: {
      threshold: compThreshold,
      ratio: config.compression.ratio,
      attack: config.compression.attack,
      release: config.compression.release,
    },
    reasoning: `${analysis.role} track: ${analysis.lufs.toFixed(1)} LUFS → ${config.targetLufs} LUFS target. ` +
      `Dynamic range: ${analysis.dynamicRange.toFixed(1)}dB. ` +
      `Spectral balance: L${(analysis.spectralBalance.low * 100).toFixed(0)} M${(analysis.spectralBalance.mid * 100).toFixed(0)} H${(analysis.spectralBalance.high * 100).toFixed(0)}.`,
  };
}

export function generateAutoMix(
  analyses: StemAnalysis[],
): AutoMixResult {
  const suggestions = analyses.map((a) => suggestForRole(a, analyses));

  const avgLufs = analyses.reduce((sum, a) => sum + a.lufs, 0) / analyses.length;
  const maxPeak = Math.max(...analyses.map((a) => a.peakDb));

  const masterSuggestion = {
    targetLufs: -14,
    targetPeak: -1,
    masterEQ: [
      { frequency: 60, gain: avgLufs < -16 ? 2 : 0 },
      { frequency: 10000, gain: maxPeak < -6 ? 1 : 0 },
    ],
  };

  return {
    suggestions,
    masterSuggestion,
    analysis: analyses,
  };
}

export function formatAnalysisReport(analysis: StemAnalysis[]): string {
  const lines: string[] = ["=== Stem Analysis Report ==="];

  for (const a of analysis) {
    lines.push(`\n[${a.role.toUpperCase()}] ${a.trackName}`);
    lines.push(`  LUFS: ${a.lufs.toFixed(1)} | Peak: ${a.peakDb.toFixed(1)}dB`);
    lines.push(`  Dynamic Range: ${a.dynamicRange.toFixed(1)}dB | Crest: ${a.crestFactor.toFixed(1)}dB`);
    lines.push(`  Spectral: L${(a.spectralBalance.low * 100).toFixed(0)} M${(a.spectralBalance.mid * 100).toFixed(0)} H${(a.spectralBalance.high * 100).toFixed(0)}`);
    lines.push(`  Transients: ${(a.transientDensity * 100).toFixed(0)}% | Stereo: ${(a.stereoWidth * 100).toFixed(0)}%`);
  }

  return lines.join("\n");
}
