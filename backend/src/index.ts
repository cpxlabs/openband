import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import extractRoutes from './routes/extract';
import masterRoutes from './routes/master';
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
    if (origin === undefined) {
      callback(null, true);
    } else if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.removeHeader('X-Powered-By');
  next();
});

let rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
setInterval(() => { rateLimitStore = {}; }, 15 * 60 * 1000);

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore[ip];
    if (!entry || now > entry.resetAt) {
      rateLimitStore[ip] = { count: 1, resetAt: now + windowMs };
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    entry.count++;
    next();
  };
}

app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit(30, 15 * 60 * 1000));

app.use('/api', extractRoutes);
app.use('/api', masterRoutes);

let demucsAvailable: boolean | null = null;

app.get('/api/health', async (_req, res) => {
  if (demucsAvailable === null) {
    demucsAvailable = await checkDemucsInstalled();
  }
  res.json({ status: 'ok' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err instanceof Error ? err.message : err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`OpenBand API running on port ${PORT}`);
});
