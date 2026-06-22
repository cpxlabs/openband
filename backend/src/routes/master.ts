import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload';

const router = Router();

const MASTER_DIR = path.resolve(process.cwd(), 'masters');

if (!fs.existsSync(MASTER_DIR)) {
  fs.mkdirSync(MASTER_DIR, { recursive: true });
}

router.post('/master/bounce', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
    }

    const { bitDepth, sampleRate, format, pluginStates } = req.body;

    const parsedBitDepth = parseInt(bitDepth, 10) || 24;
    const parsedSampleRate = parseInt(sampleRate, 10) || 44100;
    const outputFormat = format || 'wav';

    const outputFilename = `master_${Date.now()}.${outputFormat === 'mp3' ? 'mp3' : 'wav'}`;
    const outputPath = path.resolve(MASTER_DIR, outputFilename);

    await new Promise<void>((resolve, reject) => {
      const inputStream = fs.createReadStream(req.file!.path);
      const outputStream = fs.createWriteStream(outputPath);

      inputStream.pipe(outputStream);

      outputStream.on('finish', () => {
        fs.unlink(req.file!.path, (err) => {
          if (err) console.error('cleanup error:', err);
        });
        resolve();
      });

      outputStream.on('error', reject);
      inputStream.on('error', reject);
    });

    res.json({
      jobId: `${Date.now()}`,
      filename: outputFilename,
      url: `/api/master/download/${outputFilename}`,
      format: outputFormat,
      bitDepth: parsedBitDepth,
      sampleRate: parsedSampleRate,
      size: fs.statSync(outputPath).size,
      pluginStates: pluginStates ? JSON.parse(pluginStates) : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('Master bounce error:', message);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: 'Erro ao processar master', details: message });
  }
});

router.get('/master/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const filePath = path.resolve(MASTER_DIR, filename);
  if (!filePath.startsWith(MASTER_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('sendFile error:', err);
      res.status(404).json({ error: 'Master file not found' });
    }
  });
});

export default router;
