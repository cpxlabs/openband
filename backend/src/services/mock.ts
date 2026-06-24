import fs from "fs";
import path from "path";
import type { StemFile } from "../types";

async function generateSilentWav(
  filePath: string,
  durationSec: number,
): Promise<void> {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  await fs.promises.writeFile(filePath, buffer);
}

export async function runMock(
  inputPath: string,
  stemDir: string,
): Promise<StemFile[]> {
  if (!fs.existsSync(stemDir)) fs.mkdirSync(stemDir, { recursive: true });

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const duration = 30;

  const stems: StemFile[] = [
    {
      type: "drums",
      label: "Bateria",
      filename: `${baseName}-drums.wav`,
      size: 0,
      url: "",
    },
    {
      type: "bass",
      label: "Baixo",
      filename: `${baseName}-bass.wav`,
      size: 0,
      url: "",
    },
    {
      type: "vocals",
      label: "Vocal",
      filename: `${baseName}-vocals.wav`,
      size: 0,
      url: "",
    },
    {
      type: "other",
      label: "Outros",
      filename: `${baseName}-other.wav`,
      size: 0,
      url: "",
    },
  ];

  for (const stem of stems) {
    const outPath = path.join(stemDir, stem.filename);
    await generateSilentWav(outPath, duration);
    stem.size = (await fs.promises.stat(outPath)).size;
    stem.url = `/api/stems/${stem.filename}`;
  }

  return stems;
}
