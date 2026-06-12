import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import extractRoutes from './routes/extract';

const app = express();
const PORT = process.env.PORT || 3001;
const STEMS_DIR = path.resolve(process.cwd(), 'stems');

if (!fs.existsSync(STEMS_DIR)) {
  fs.mkdirSync(STEMS_DIR, { recursive: true });
}

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api', extractRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', demucs: false });
});

app.listen(PORT, () => {
  console.log(`🎵 OpenBand API rodando em http://localhost:${PORT}`);
});
