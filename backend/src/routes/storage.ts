import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware";
import { createPresigner, getMockStore } from "../lib/objectStorage";

const router = Router();

router.post(
  "/storage/presign-upload",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hash, filename, contentType } = req.body || {};
      if (!hash || !filename) {
        return res
          .status(400)
          .json({ error: "hash e filename são obrigatórios" });
      }
      const userId = req.userTokenData?.userId ?? "anon";
      const key = `${userId}/${hash.slice(0, 16)}_${filename}`;
      const presigner = await createPresigner();
      const result = await presigner.presignPut(key, contentType);
      res.json(result);
    } catch (e) {
      console.error("presign-upload error:", e);
      res.status(500).json({ error: "Falha ao gerar URL de upload" });
    }
  },
);

router.get(
  "/storage/presign-download",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const key = req.query.key as string | undefined;
      if (!key) {
        return res.status(400).json({ error: "key é obrigatório" });
      }
      const presigner = await createPresigner();
      const result = await presigner.presignGet(key);
      res.json(result);
    } catch (e) {
      console.error("presign-download error:", e);
      res.status(500).json({ error: "Falha ao gerar URL de download" });
    }
  },
);

router.get(
  "/storage/head",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const key = req.query.key as string | undefined;
      if (!key) {
        return res.status(400).json({ error: "key é obrigatório" });
      }
      const presigner = await createPresigner();
      const exists = await presigner.head(key);
      res.json({ exists });
    } catch (e) {
      console.error("head error:", e);
      res.status(500).json({ error: "Falha ao verificar asset" });
    }
  },
);

router.put(
  "/storage/mock/*",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const key = req.params[0];
    if (!key) return res.status(400).json({ error: "key ausente" });
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      getMockStore().set(key, Buffer.concat(chunks));
      res.json({ ok: true });
    });
    req.on("error", () => {
      if (!res.headersSent) res.status(500).json({ error: "upload falhou" });
    });
  },
);

router.get(
  "/storage/mock/*",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const key = req.params[0];
    if (!key) return res.status(400).json({ error: "key ausente" });
    const buf = getMockStore().get(key);
    if (!buf) return res.status(404).json({ error: "asset não encontrado" });
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buf);
  },
);

export default router;
