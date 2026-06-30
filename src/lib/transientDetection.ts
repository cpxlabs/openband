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
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = 1024;
  const hopSize = 512;
  const minSpacingSamples = (minSpacingMs / 1000) * sampleRate;

  const energies: number[] = [];
  for (let i = 0; i < channelData.length; i += hopSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, channelData.length);
    for (let j = i; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }
    energies.push(Math.sqrt(sum / (end - i)));
  }

  const maxEnergy = Math.max(...energies, 0.001);
  const normalizedEnergies = energies.map((e) => e / maxEnergy);

  const transients: Transient[] = [];
  let lastTransientIndex = -minSpacingSamples;

  for (let i = 1; i < normalizedEnergies.length - 1; i++) {
    const prev = normalizedEnergies[i - 1];
    const curr = normalizedEnergies[i];
    const next = normalizedEnergies[i + 1];

    const isLocalMax = curr > prev && curr > next;
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
  const channelData = buffer.getChannelData(0);
  const sorted = [0, ...slicePoints.sort((a, b) => a - b), buffer.duration];
  const slices: AudioBuffer[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const startSample = Math.floor(sorted[i] * sampleRate);
    const endSample = Math.floor(sorted[i + 1] * sampleRate);
    const length = endSample - startSample;

    if (length <= 0) continue;

    const ctx = new OfflineAudioContext(1, length, sampleRate);
    const newBuffer = ctx.createBuffer(1, length, sampleRate);
    const newData = newBuffer.getChannelData(0);

    for (let j = 0; j < length; j++) {
      newData[j] = channelData[startSample + j] ?? 0;
    }

    slices.push(newBuffer);
  }

  return slices;
}
