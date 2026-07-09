import { Mp3Encoder } from "lamejs";

const MAX_CACHE_SIZE = 100;
const cache = new Map<string, number[]>();

export function generateWaveform(seed: string, count: number): number[] {
  const key = `${seed}-${count}`;
  if (cache.has(key)) return cache.get(key)?.slice() ?? [];
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  const data: number[] = [];
  let h = djb2Hash(seed);
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const t = i / count;
    const envelope = Math.sin(t * Math.PI) * 0.9 + 0.1;
    const shape =
      Math.sin(i * 0.5) * 0.4 +
      Math.sin(i * 1.3) * 0.3 +
      Math.sin(i * 3.7) * 0.2;
    const noise = ((h & 0xff) / 255) * 2 - 1;
    data.push(
      Math.max(-1, Math.min(1, (shape * 0.6 + noise * 0.4) * envelope)),
    );
  }
  cache.set(key, data);
  return data;
}

export function djb2Hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function writeWavHeader(
  view: DataView,
  offset: number,
  numChannels: number,
  sampleRate: number,
  bitDepth: number,
  dataSize: number,
): void {
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);

  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(o + i, str.charCodeAt(i));
  };
  const write16 = (o: number, v: number) => view.setUint16(o, v, true);
  const write32 = (o: number, v: number) => view.setUint32(o, v, true);

  writeStr(offset, "RIFF");
  write32(offset + 4, 36 + dataSize);
  writeStr(offset + 8, "WAVE");
  writeStr(offset + 12, "fmt ");
  write32(offset + 16, 16);
  write16(offset + 20, 1);
  write16(offset + 22, numChannels);
  write32(offset + 24, sampleRate);
  write32(offset + 28, byteRate);
  write16(offset + 32, blockAlign);
  write16(offset + 34, bitDepth);
  writeStr(offset + 36, "data");
  write32(offset + 40, dataSize);
}

export function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: number = 16): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  writeWavHeader(view, 0, numChannels, sampleRate, bitDepth, dataSize);

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const offset = headerSize + (i * numChannels + ch) * bytesPerSample;

      if (bitDepth === 16) {
        const pcm = Math.max(
          -32768,
          Math.min(32767, Math.round(sample * 32767)),
        );
        view.setInt16(offset, pcm, true);
      } else if (bitDepth === 24) {
        const pcm = Math.max(
          -8388608,
          Math.min(8388607, Math.round(sample * 8388607)),
        );
        view.setInt8(offset, pcm & 0xff);
        view.setInt8(offset + 1, (pcm >> 8) & 0xff);
        view.setInt8(offset + 2, (pcm >> 16) & 0xff);
      } else {
        view.setFloat32(offset, sample, true);
      }
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

export async function audioBufferToMp3BlobAsync(buffer: AudioBuffer, kbps: number = 192, onProgress?: (pct: number) => void): Promise<Blob> {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  const sampleBlockSize = 1152; 
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right.subarray(i, i + sampleBlockSize);

    const leftInt16 = new Int16Array(leftChunk.length);
    const rightInt16 = new Int16Array(rightChunk.length);

    for (let j = 0; j < leftChunk.length; j++) {
      leftInt16[j] = Math.max(-32768, Math.min(32767, Math.round(leftChunk[j] * 32767)));
      rightInt16[j] = Math.max(-32768, Math.min(32767, Math.round(rightChunk[j] * 32767)));
    }

    const mp3buf = encoder.encodeBuffer(leftInt16, numChannels > 1 ? rightInt16 : undefined);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    if (i > 0 && i % (sampleBlockSize * 100) === 0) {
      if (onProgress) onProgress(Math.round((i / left.length) * 100));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Data.push(new Uint8Array(flush));
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: "audio/mpeg" });
}
