import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { StemFile } from '../types';

const OUTPUT_DIR = path.resolve(process.cwd(), 'stems');
const DEMUCS_MODEL = 'htdemucs';

interface DemucsOptions {
  inputPath: string;
  stemDir: string;
  onProgress?: (stage: string, pct: number) => void;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function execPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('python3', ['-u', ...args], {
      maxBuffer: 1024 * 1024 * 100,
      timeout: 1000 * 60 * 30,
    }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr || stdout || err.message;
        if (msg.toLowerCase().includes('no module named demucs')) {
          return reject(new Error('DEMUCS_NOT_FOUND'));
        }
        return reject(new Error(msg));
      }
      resolve(stdout);
    });
  });
}

export async function runDemucs(options: DemucsOptions): Promise<StemFile[]> {
  const { inputPath, stemDir, onProgress } = options;
  const baseName = path.basename(inputPath, path.extname(inputPath));

  onProgress?.('Preparando áudio...', 5);

  const demucsOut = path.join(stemDir, DEMUCS_MODEL, baseName);

  if (fs.existsSync(demucsOut)) {
    fs.rmSync(demucsOut, { recursive: true });
  }

  onProgress?.('Iniciando Demucs (htdemucs)...', 10);

  const args = [
    '-m', 'demucs',
    '--two-stems', 'vocals',
    '-o', stemDir,
    inputPath,
  ];

  await execPython(args);
  onProgress?.('Stems gerados, organizando...', 90);

  const stemMap: Record<string, { type: 'drums' | 'bass' | 'vocals' | 'other'; label: string }> = {
    drums: { type: 'drums', label: 'Bateria' },
    bass: { type: 'bass', label: 'Baixo' },
    vocals: { type: 'vocals', label: 'Vocal' },
    other: { type: 'other', label: 'Outros' },
  };

  ensureDir(stemDir);

  const stems: StemFile[] = [];

  for (const [stemName, meta] of Object.entries(stemMap)) {
    const stemPath = path.join(demucsOut, `${stemName}.wav`);
    const destPath = path.join(stemDir, `${baseName}-${stemName}.wav`);

    if (fs.existsSync(stemPath)) {
      fs.cpSync(stemPath, destPath);
      stems.push({
        type: meta.type,
        label: meta.label,
        filename: `${baseName}-${stemName}.wav`,
        size: fs.statSync(destPath).size,
        url: `/api/stems/${baseName}-${stemName}.wav`,
      });
    }
  }

  onProgress?.('Finalizando...', 100);
  return stems;
}

export async function checkDemucsInstalled(): Promise<boolean> {
  try {
    await execPython(['-c', 'import demucs; print("ok")']);
    return true;
  } catch {
    return false;
  }
}
