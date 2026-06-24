import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { upload } from "../middleware/upload";

function safeJsonParse(s: unknown): unknown {
  if (typeof s !== "string" || !s) return undefined;
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error("JSON parse failed:", s.slice(0, 100), e);
    return undefined;
  }
}

const router = Router();

const MASTER_DIR = process.env.VERCEL
  ? "/tmp/masters"
  : path.resolve(process.cwd(), "masters");

if (!fs.existsSync(MASTER_DIR)) {
  fs.mkdirSync(MASTER_DIR, { recursive: true });
}

router.post(
  "/master/bounce",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("audio")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE")
            return res
              .status(413)
              .json({ error: "Arquivo muito grande. Máximo 200MB." });
          return res
            .status(400)
            .json({ error: `Erro no upload: ${err.message}` });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Nenhum arquivo de áudio enviado." });
      }

      const { bitDepth, sampleRate, format, pluginStates } = req.body || {};

      const parsedBitDepth = (() => {
        const v = parseInt(bitDepth, 10);
        return Number.isNaN(v) ? 24 : v;
      })();
      const parsedSampleRate = (() => {
        const v = parseInt(sampleRate, 10);
        return Number.isNaN(v) ? 44100 : v;
      })();
      const outputFormat = format || "wav";

      const outputFilename = `master_${Date.now()}.${outputFormat === "mp3" ? "mp3" : "wav"}`;
      const outputPath = path.resolve(MASTER_DIR, outputFilename);

      const filePath = req.file!.path;
      await new Promise<void>((resolve, reject) => {
        const inputStream = fs.createReadStream(filePath);
        const outputStream = fs.createWriteStream(outputPath);
        let done = false;
        function cleanup(err?: Error) {
          if (done) return;
          done = true;
          inputStream.destroy();
          outputStream.destroy();
          fs.unlink(outputPath, (e) => {
            if (e) console.error("cleanup error:", e);
          });
          if (err) reject(err);
        }

        outputStream.on("error", cleanup);
        inputStream.on("error", cleanup);

        inputStream.pipe(outputStream);

        outputStream.on("finish", () => {
          fs.unlink(req.file!.path, (err) => {
            if (err) console.error("cleanup error:", err);
          });
          done = true;
          resolve();
        });
      });

      res.json({
        jobId: `${Date.now()}`,
        filename: outputFilename,
        url: `/api/master/download/${outputFilename}`,
        format: outputFormat,
        bitDepth: parsedBitDepth,
        sampleRate: parsedSampleRate,
        size: (await fs.promises.stat(outputPath)).size,
        pluginStates: pluginStates ? safeJsonParse(pluginStates) : undefined,
        jobParams: {
          bitDepth: parsedBitDepth,
          sampleRate: parsedSampleRate,
          format: outputFormat,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Master bounce error:", message);
      if (req.file) {
        fs.unlink(req.file.path, (e) => {
          if (e) console.error("cleanup error:", e);
        });
      }
      const isProduction = process.env.NODE_ENV === "production";
      res.status(500).json({
        error: "Erro ao processar master",
        ...(isProduction ? {} : { details: message }),
      });
    }
  },
);

router.get("/master/download/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0")
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const filePath = path.resolve(MASTER_DIR, filename);
  if (!filePath.startsWith(MASTER_DIR)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      if (res.headersSent) return;
      console.error("sendFile error:", err);
      res.status(404).json({ error: "Master file not found" });
    }
  });
});

export default router;
