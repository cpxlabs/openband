import { Router, Request, Response } from "express";

interface ClientEntry {
  id: string;
  res: Response;
  userId: string;
  userName: string;
}

interface CollabOperation {
  id: string;
  userId: string;
  timestamp: number;
  type: string;
  path: string;
  value: unknown;
  clientId: string;
}

const MAX_KEY_LENGTH = 128;
const MAX_USERNAME_LENGTH = 64;
const MAX_CONNECTIONS_PER_PROJECT = 50;
const STALE_TIMEOUT_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const projectClients = new Map<string, Map<string, ClientEntry>>();
const projectOperations = new Map<string, CollabOperation[]>();
const userLastSeen = new Map<string, Map<string, number>>();

function isValidKey(key: string): boolean {
  if (!key || key.length > MAX_KEY_LENGTH) return false;
  if (key.includes("..") || key.includes("/") || key.includes("\\")) return false;
  return true;
}

function sanitizeString(s: string, maxLen: number): string {
  return s.replace(/[^\w\s@.\-]/g, "").slice(0, maxLen);
}

function getProjectClients(projectId: string): Map<string, ClientEntry> {
  if (!projectClients.has(projectId)) {
    projectClients.set(projectId, new Map());
  }
  return projectClients.get(projectId)!;
}

function getProjectOps(projectId: string): CollabOperation[] {
  if (!projectOperations.has(projectId)) {
    projectOperations.set(projectId, []);
  }
  return projectOperations.get(projectId)!;
}

function broadcastToProject(
  projectId: string,
  data: unknown,
  excludeUserId?: string,
): void {
  const clients = getProjectClients(projectId);
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of clients) {
    if (client.userId === excludeUserId) continue;
    try {
      const ok = client.res.write(message);
      if (!ok) {
        clients.delete(id);
      }
    } catch {
      clients.delete(id);
    }
  }
}

function broadcastUserList(projectId: string): void {
  const clients = getProjectClients(projectId);
  const users: { userId: string; userName: string }[] = [];
  for (const [, client] of clients) {
    if (!users.find((u) => u.userId === client.userId)) {
      users.push({ userId: client.userId, userName: client.userName });
    }
  }
  broadcastToProject(projectId, { type: "users", users });
}

function cleanupClient(projectId: string, clientEntry: ClientEntry): void {
  const clients = getProjectClients(projectId);
  clients.delete(clientEntry.id);
  broadcastUserList(projectId);
}

setInterval(() => {
  const now = Date.now();
  for (const [projectId, clients] of projectClients) {
    const lastSeenMap = userLastSeen.get(projectId);
    if (lastSeenMap) {
      for (const [userId, timestamp] of lastSeenMap) {
        if (now - timestamp > STALE_TIMEOUT_MS) {
          for (const [id, client] of clients) {
            if (client.userId === userId) {
              cleanupClient(projectId, client);
              break;
            }
          }
          lastSeenMap.delete(userId);
        }
      }
    }
    if (clients.size === 0) {
      projectClients.delete(projectId);
      projectOperations.delete(projectId);
      userLastSeen.delete(projectId);
    }
  }
}, CLEANUP_INTERVAL_MS);

const router = Router();

router.get(
  "/api/collab/:projectId/subscribe",
  (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!isValidKey(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }

    const userId = sanitizeString(
      (req.query.userId as string) || `anon-${Date.now()}`,
      MAX_KEY_LENGTH,
    );
    const userName = sanitizeString(
      (req.query.userName as string) || userId,
      MAX_USERNAME_LENGTH,
    );

    const clients = getProjectClients(projectId);
    const existingForUser = Array.from(clients.values()).filter(
      (c) => c.userId === userId,
    );
    if (existingForUser.length >= 3) {
      res.status(429).json({ error: "Too many connections per user" });
      return;
    }
    if (clients.size >= MAX_CONNECTIONS_PER_PROJECT) {
      res.status(503).json({ error: "Project connection limit reached" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const clientEntry: ClientEntry = {
      id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      res,
      userId,
      userName,
    };
    clients.set(clientEntry.id, clientEntry);

    if (!userLastSeen.has(projectId)) {
      userLastSeen.set(projectId, new Map());
    }
    userLastSeen.get(projectId)!.set(userId, Date.now());

    const ops = getProjectOps(projectId);
    if (ops.length > 0) {
      res.write(
        `data: ${JSON.stringify({ type: "fullState", state: JSON.stringify({ operations: ops }) })}\n\n`,
      );
    }

    broadcastUserList(projectId);

    const keepAlive = setInterval(() => {
      try {
        res.write(": keepalive\n\n");
        const map = userLastSeen.get(projectId);
        if (map) map.set(userId, Date.now());
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      cleanupClient(projectId, clientEntry);
    });

    req.on("error", () => {
      clearInterval(keepAlive);
      cleanupClient(projectId, clientEntry);
    });
  },
);

router.post(
  "/api/collab/:projectId/operation",
  (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (!isValidKey(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }

    const { operation, userId, userName } = req.body as {
      operation: CollabOperation;
      userId: string;
      userName?: string;
    };

    if (!userId || !operation || !operation.id) {
      res.status(400).json({ error: "Invalid operation" });
      return;
    }

    const ops = getProjectOps(projectId);
    if (!ops.find((o) => o.id === operation.id)) {
      ops.push(operation);
      if (ops.length > 10000) {
        ops.splice(0, ops.length - 10000);
      }
    }

    broadcastToProject(
      projectId,
      { type: "operations", operations: [operation] },
      userId,
    );

    res.json({ ok: true });
  },
);

export default router;
