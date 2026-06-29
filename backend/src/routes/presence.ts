import { Router, Request, Response } from "express";

interface ClientEntry {
  id: string;
  res: Response;
  userId: string;
  userName: string;
}

interface PresenceData {
  userId: string;
  userName: string;
  cursorX: number;
  activeTrackId: string | null;
  playheadPosition: number;
}

const projectClients = new Map<string, Map<string, ClientEntry>>();
const userPresence = new Map<string, Map<string, PresenceData>>();

function getProjectClients(projectId: string): Map<string, ClientEntry> {
  if (!projectClients.has(projectId)) {
    projectClients.set(projectId, new Map());
  }
  return projectClients.get(projectId)!;
}

function getUserPresence(projectId: string): Map<string, PresenceData> {
  if (!userPresence.has(projectId)) {
    userPresence.set(projectId, new Map());
  }
  return userPresence.get(projectId)!;
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
      client.res.write(message);
    } catch {
      clients.delete(id);
    }
  }
}

function cleanupClient(projectId: string, clientEntry: ClientEntry): void {
  const clients = getProjectClients(projectId);
  clients.delete(clientEntry.id);

  const presence = getUserPresence(projectId);
  presence.delete(clientEntry.userId);

  broadcastToProject(projectId, {
    userId: clientEntry.userId,
    disconnected: true,
  });
}

const router = Router();

router.get(
  "/api/presence/:projectId/subscribe",
  (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = (req.query.userId as string) || `anon-${Date.now()}`;
    const userName = (req.query.userName as string) || userId;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.write(`data: ${JSON.stringify({ connected: true, userId })}\n\n`);

    const clientEntry: ClientEntry = {
      id: `${userId}-${Date.now()}`,
      res,
      userId,
      userName,
    };

    const clients = getProjectClients(projectId);
    clients.set(clientEntry.id, clientEntry);

    const existingPresence = getUserPresence(projectId);
    for (const [, data] of existingPresence) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    broadcastToProject(projectId, {
      userId,
      userName,
      joined: true,
    });

    const keepAlive = setInterval(() => {
      try {
        res.write(": keepalive\n\n");
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
  "/api/presence/:projectId/cursor",
  (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { userId, userName, cursorX, activeTrackId, playheadPosition } =
      req.body as {
        userId: string;
        userName?: string;
        cursorX: number;
        activeTrackId: string | null;
        playheadPosition: number;
      };

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const presence = getUserPresence(projectId);
    presence.set(userId, {
      userId,
      userName: userName || userId,
      cursorX,
      activeTrackId,
      playheadPosition,
    });

    broadcastToProject(
      projectId,
      { userId, userName: userName || userId, cursorX, activeTrackId, playheadPosition },
      userId,
    );

    res.json({ ok: true });
  },
);

router.post(
  "/api/presence/:projectId/leave",
  (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { userId } = req.body as { userId: string };
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const clients = getProjectClients(projectId);
    for (const [id, client] of clients) {
      if (client.userId === userId) {
        cleanupClient(projectId, client);
        break;
      }
    }

    res.json({ ok: true });
  },
);

export default router;
