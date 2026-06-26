import { Router, Request, Response } from "express";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const router = Router();

function sanitizePath(input: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, path.basename(input));
  if (!resolved.startsWith(baseDir)) throw new Error("Path escape attempt");
  if (/[;&|$`\\'"()]/.test(input)) throw new Error("Invalid characters in path");
  return resolved;
}

router.post("/export/video", async (req: Request, res: Response) => {
  try {
    const { audioPath, coverPath } = req.body;
    if (!audioPath || !coverPath) {
      return res
        .status(400)
        .json({ error: "audioPath e coverPath obrigatórios" });
    }

    const outputDir = process.env.VERCEL
      ? "/tmp/videos"
      : path.resolve(process.cwd(), "videos");
    if (!fs.existsSync(outputDir))
      fs.mkdirSync(outputDir, { recursive: true });

    const safeAudioPath = sanitizePath(audioPath, outputDir);
    const safeCoverPath = sanitizePath(coverPath, outputDir);
    const outputPath = path.join(outputDir, `export_${Date.now()}.mp4`);

    await execFileAsync("ffmpeg", [
      "-loop", "1",
      "-i", safeCoverPath,
      "-i", safeAudioPath,
      "-filter_complex", "[1:a]showwaves=s=1080x200:mode=line:colors=0x3b82f6[v];[0:v]scale=1080:1920,boxblur=20[bg];[bg][v]overlay=0:(main_h-overlay_h)/2:short=1",
      "-c:a", "aac",
      "-b:a", "192k",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-shortest",
      "-y",
      outputPath,
    ]);

    res.json({
      url: `/videos/${path.basename(outputPath)}`,
      outputPath,
    });
  } catch (e) {
    console.error("Video export failed:", e);
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
      error: "Falha na exportação de vídeo",
      ...(isProduction ? {} : { details: String(e) }),
    });
  }
});

export default router;
