import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { upload } from "../middleware/upload";
import { runDemucs, checkDemucsInstalled } from "../services/demucs";
import { runMock } from "../services/mock";
import type { ExtractResponse, ErrorResponse } from "../types";

const router = Router();

const STEMS_DIR = process.env.VERCEL
  ? "/tmp/stems"
  : path.resolve(process.cwd(), "stems");

const isProduction = process.env.NODE_ENV === "production";

function cleanup(filePath: string | undefined): void {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.error("cleanup error:", err);
  });
}

router.post("/extract", (req: Request, res: Response) => {
  upload.single("audio")(req, res, async (err) => {
    try {
      if (err) {
        console.error("Upload error:", err.message);
        const body: ErrorResponse = {
          error: "Upload failed",
          ...(isProduction ? {} : { details: err.message }),
        };
        return res.status(400).json(body);
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      try {
        const hasDemucs = await checkDemucsInstalled();
        const stems = hasDemucs
          ? await runDemucs({
              inputPath: req.file.path,
              stemDir: STEMS_DIR,
            })
          : await runMock(req.file.path, STEMS_DIR);

        if (req.file) cleanup(req.file.path);

        const body: ExtractResponse = {
          jobId: `${Date.now()}`,
          stems,
          duration: 30,
        };

        res.json(body);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro desconhecido";

        if (message === "DEMUCS_NOT_FOUND") {
          try {
            if (!req.file) throw new Error("No file uploaded");
            const stems = await runMock(req.file.path, STEMS_DIR);
            cleanup(req.file.path);
            return res.json({
              jobId: `${Date.now()}`,
              stems,
              duration: 30,
              warning:
                "Demucs não instalado. Usando simulação. Para resultados reais: pip install demucs",
            });
          } catch (e) {
            console.error("Stem processing error:", e);
            return res
              .status(500)
              .json({ error: "Erro ao processar áudio (fallback falhou)" });
          }
        }

        cleanup(req.file?.path);
        console.error("Extract error:", message);
        res.status(500).json({
          error: "Erro ao processar áudio",
          ...(isProduction ? {} : { details: message }),
        });
      }
    } catch (e) {
      console.error("Fatal error:", e);
      cleanup(req.file?.path);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

router.get("/stems/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0")
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const filePath = path.resolve(STEMS_DIR, filename);
  if (!filePath.startsWith(STEMS_DIR)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      if (res.headersSent) return;
      console.error("sendFile error:", err);
      res.status(404).json({ error: "Stem file not found" });
    }
  });
});

router.post("/stems/manifest", (req: Request, res: Response) => {
  const { projectId, bpm, key, chords, tracks } = req.body || {};

  if (!projectId || bpm === undefined || !key || !Array.isArray(chords) || !Array.isArray(tracks)) {
    return res.status(400).json({
      error:
        "projectId, bpm, key, chords[] e tracks[] são obrigatórios",
    });
  }

  const manifest = {
    generator: "Openband DAW Engine v2.0",
    projectOriginId: projectId,
    sessionMetadata: {
      globalBpm: bpm,
      globalKey: key,
      chordsSequence: chords,
    },
    stemsRegistry: tracks.map(
      (track: Record<string, unknown>) => ({
        filename: `${String(track.name || "track").toLowerCase().replace(/\s+/g, "_")}.wav`,
        trackType:
          track.midiNotes &&
          Array.isArray(track.midiNotes) &&
          track.midiNotes.length > 0
            ? "midi_synthesizer"
            : "audio_track",
        trackName: String(track.name || "track"),
        isMono: false,
        ...(track.midiNotes &&
        Array.isArray(track.midiNotes) &&
        track.midiNotes.length > 0
          ? {
              patchRef: String(track.name || "track")
                .toLowerCase()
                .replace(/\s+/g, "_"),
            }
          : {}),
      }),
    ),
  };

  res.json(manifest);
});

export default router;
