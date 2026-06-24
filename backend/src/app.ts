import express from "express";
import cors from "cors";
import extractRoutes from "./routes/extract";
import masterRoutes from "./routes/master";
import generatorRoutes from "./routes/generator";
import { checkDemucsInstalled } from "./services/demucs";

const app = express();
app.set("trust proxy", 1);

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:3000",
  "http://localhost:19006",
  "exp://localhost:19000",
  "exp://localhost:19001",
  "http://127.0.0.1:8081",
  /\.vercel\.app$/,
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (origin === undefined) return callback(null, true);
      if (
        ALLOWED_ORIGINS.some((o) =>
          typeof o === "string" ? o === origin : o.test(origin),
        )
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.removeHeader("X-Powered-By");
  next();
});

const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};
const RATE_LIMIT_MAX_ENTRIES = 10000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Object.entries(rateLimitStore)) {
    if (now > entry.resetAt) delete rateLimitStore[ip];
  }
  if (Object.keys(rateLimitStore).length > RATE_LIMIT_MAX_ENTRIES) {
    const sorted = Object.entries(rateLimitStore).sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (const [ip] of sorted.slice(0, sorted.length - RATE_LIMIT_MAX_ENTRIES))
      delete rateLimitStore[ip];
  }
}, 60 * 1000);

function rateLimit(maxRequests: number, windowMs: number) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitStore[ip];
    if (!entry || now > entry.resetAt) {
      rateLimitStore[ip] = { count: 1, resetAt: now + windowMs };
      return next();
    }
    if (entry.count >= maxRequests) {
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    }
    entry.count++;
    next();
  };
}

app.use(express.json({ limit: "1mb" }));

let demucsCheckPromise: Promise<boolean> | null = null;

app.get("/api/health", async (_req, res) => {
  if (demucsCheckPromise === null) {
    demucsCheckPromise = checkDemucsInstalled();
  }
  const demucsOk = await demucsCheckPromise;
  demucsCheckPromise = null;
  res.json({ status: "ok", demucs: demucsOk });
});

app.use("/api", rateLimit(30, 15 * 60 * 1000));
app.use("/api", extractRoutes);
app.use("/api", masterRoutes);
app.use("/api", generatorRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
