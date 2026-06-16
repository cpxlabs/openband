import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload';
import { runDemucs, checkDemucsInstalled } from '../services/demucs';
import { runMock } from '../services/mock';
import type { ExtractResponse, ErrorResponse } from '../types';

const router = Router();

const STEMS_DIR = path.resolve(process.cwd(), 'stems');

const isProduction = process.env.NODE_ENV === 'production';

router.post('/extract', (req: Request, res: Response) => {
  upload.single('audio')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      const body: ErrorResponse = { error: 'Upload failed', ...(isProduction ? {} : { details: err.message }) };
      return res.status(400).json(body);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    try {
      const hasDemucs = await checkDemucsInstalled();
      const stems = hasDemucs
        ? await runDemucs({
            inputPath: req.file.path,
            stemDir: STEMS_DIR,
          })
        : await runMock(req.file.path, STEMS_DIR);

      const body: ExtractResponse = {
        jobId: `${Date.now()}`,
        stems,
        duration: 30,
      };

      res.json(body);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro desconhecido';

      if (message === 'DEMUCS_NOT_FOUND') {
        const stems = await runMock(req.file.path, STEMS_DIR);
        return res.json({
          jobId: `${Date.now()}`,
          stems,
          duration: 30,
          warning: 'Demucs não instalado. Usando simulação. Para resultados reais: pip install demucs',
        } as ExtractResponse & { warning: string });
      }

      console.error('Extract error:', message);
      res.status(500).json({ error: 'Erro ao processar áudio', ...(isProduction ? {} : { details: message }) });
    }
  });
});

router.get('/stems/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const filePath = path.resolve(STEMS_DIR, filename);
  if (!filePath.startsWith(STEMS_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Stem não encontrado.' });
  }
  res.sendFile(filePath);
});

export default router;
