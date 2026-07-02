export interface Transient {
  time: number;
  energy: number;
  index: number;
}

export function detectTransients(
  buffer: AudioBuffer,
  threshold: number = 0.3,
  minSpacingMs: number = 50,
): Transient[] {
  // Use all channels for energy detection
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const windowSize = 1024;
  const hopSize = 512;
  const minSpacingSamples = (minSpacingMs / 1000) * sampleRate;

  const energies: number[] = [];
  for (let i = 0; i < buffer.length; i += hopSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, buffer.length);
    const count = (end - i) * numChannels;
    for (let ch = 0; ch < numChannels; ch++) {
      const chData = buffer.getChannelData(ch);
      for (let j = i; j < end; j++) {
        sum += chData[j] * chData[j];
      }
    }
    energies.push(Math.sqrt(sum / count));
  }

  const maxEnergy = Math.max(...energies, 0.001);
  const normalizedEnergies = energies.map((e) => e / maxEnergy);

  // Use onset detection function (spectral flux approximation via energy difference)
  const onsets: number[] = [];
  for (let i = 1; i < normalizedEnergies.length; i++) {
    const diff = normalizedEnergies[i] - normalizedEnergies[i - 1];
    onsets.push(Math.max(0, diff));
  }

  const maxOnset = Math.max(...onsets, 0.001);
  const normalizedOnsets = onsets.map((o) => o / maxOnset);

  const transients: Transient[] = [];
  let lastTransientIndex = -minSpacingSamples;

  for (let i = 1; i < normalizedOnsets.length - 1; i++) {
    const curr = normalizedOnsets[i];
    const isLocalMax = curr > normalizedOnsets[i - 1] && curr > normalizedOnsets[i + 1];
    const aboveThreshold = curr > threshold;
    const spaced = i * hopSize - lastTransientIndex >= minSpacingSamples;

    if (isLocalMax && aboveThreshold && spaced) {
      const sampleIndex = i * hopSize;
      transients.push({
        time: sampleIndex / sampleRate,
        energy: curr,
        index: sampleIndex,
      });
      lastTransientIndex = sampleIndex;
    }
  }

  return transients;
}

export function sliceAudioBuffer(
  buffer: AudioBuffer,
  slicePoints: number[],
): AudioBuffer[] {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const sorted = [0, ...slicePoints.sort((a, b) => a - b), buffer.duration];
  const slices: AudioBuffer[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const startSample = Math.floor(sorted[i] * sampleRate);
    const endSample = Math.floor(sorted[i + 1] * sampleRate);
    const length = endSample - startSample;

    if (length <= 0) continue;

    const sliceBuffer = new OfflineAudioContext(
      numChannels,
      length,
      sampleRate,
    ).createBuffer(numChannels, length, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const chData = buffer.getChannelData(ch);
      const sliceData = sliceBuffer.getChannelData(ch);
      for (let j = 0; j < length; j++) {
        sliceData[j] = chData[startSample + j] ?? 0;
      }
    }

    slices.push(sliceBuffer);
  }

  return slices;
}
