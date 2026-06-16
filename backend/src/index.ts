import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import extractRoutes from './routes/extract';
import { checkDemucsInstalled } from './services/demucs';

const app = express();
const PORT = process.env.PORT || 3001;
const STEMS_DIR = path.resolve(process.cwd(), 'stems');

if (!fs.existsSync(STEMS_DIR)) {
  fs.mkdirSync(STEMS_DIR, { recursive: true });
}

const ALLOWED_ORIGINS = ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006', 'exp://localhost:19000', 'exp://localhost:19001', 'http://127.0.0.1:8081'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json());

app.use('/api', extractRoutes);

let demucsAvailable: boolean | null = null;

app.get('/api/health', async (_req, res) => {
  if (demucsAvailable === null) {
    demucsAvailable = await checkDemucsInstalled();
  }
  res.json({ status: 'ok', demucs: demucsAvailable });
});

app.listen(PORT, () => {
  console.log(`🎵 OpenBand API rodando em http://localhost:${PORT}`);
});
