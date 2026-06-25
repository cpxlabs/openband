import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import type { StemFile } from "../types";

const DEMUCS_MODEL = "htdemucs";

interface DemucsOptions {
  inputPath: string;
  stemDir: string;
  onProgress?: (stage: string, pct: number) => void;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const PYTHON_PATH = (() => {
  const env = process.env.PYTHON_PATH;
  if (env) {
    if (path.isAbsolute(env)) return env;
    console.warn(
      `[demucs] PYTHON_PATH="${env}" is not absolute — using default .venv path`,
    );
  }
  return path.resolve(process.cwd(), ".venv/bin/python3");
})();

function execPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON_PATH,
      ["-u", ...args],
      {
        maxBuffer: 1024 * 1024 * 100,
        timeout: 1000 * 60 * 30,
      },
      (err, stdout, stderr) => {
        if (err) {
          const msg = stderr || stdout || err.message;
          if (msg.toLowerCase().includes("no module named demucs")) {
            return reject(new Error("DEMUCS_NOT_FOUND"));
          }
          return reject(new Error(msg));
        }
        resolve(stdout);
      },
    );
  });
}

export async function runDemucs(options: DemucsOptions): Promise<StemFile[]> {
  const { inputPath, stemDir, onProgress } = options;
  const baseName = path.basename(inputPath, path.extname(inputPath));

  onProgress?.("Preparando áudio...", 5);

  const demucsOut = path.join(stemDir, DEMUCS_MODEL, baseName);

  await fs.promises
    .rm(demucsOut, { recursive: true, force: true })
    .catch((e) => console.warn("failed to clean demucs output:", e));

  onProgress?.("Iniciando Demucs (htdemucs)...", 10);

  const args = ["-m", "demucs", "-o", stemDir, inputPath];

  await execPython(args);
  onProgress?.("Stems gerados, organizando...", 90);

  const stemMap: Record<
    string,
    { type: "drums" | "bass" | "vocals" | "other"; label: string }
  > = {
    drums: { type: "drums", label: "Bateria" },
    bass: { type: "bass", label: "Baixo" },
    vocals: { type: "vocals", label: "Vocal" },
    other: { type: "other", label: "Outros" },
  };

  ensureDir(stemDir);

  const stems: StemFile[] = [];

  for (const [stemName, meta] of Object.entries(stemMap)) {
    const stemPath = path.join(demucsOut, `${stemName}.wav`);
    const destPath = path.join(stemDir, `${baseName}-${stemName}.wav`);

    try {
      await fs.promises.access(stemPath, fs.constants.R_OK);
      await fs.promises.cp(stemPath, destPath);
      const size = (await fs.promises.stat(destPath)).size;
      stems.push({
        type: meta.type,
        label: meta.label,
        filename: `${baseName}-${stemName}.wav`,
        size,
        url: `/api/stems/${baseName}-${stemName}.wav`,
      });
    } catch (e) {
      console.warn(`Stem ${stemName} error at ${stemPath}:`, e);
    }
  }

  onProgress?.("Finalizando...", 100);
  return stems;
}

export async function checkDemucsInstalled(): Promise<boolean> {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        PYTHON_PATH,
        ["-c", 'import demucs; print("ok")'],
        {
          timeout: 15000,
          maxBuffer: 1024,
        },
        (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        },
      );
    });
    return result.trim() === "ok";
  } catch (e) {
    console.warn("checkDemucsInstalled failed:", e);
    return false;
  }
}
