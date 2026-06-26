import { Response, NextFunction } from "express"
import { AuthenticatedRequest } from "./authMiddleware"

const blacklistedTokens = new Set<string>()

export function addToBlacklist(tokenHash: string) {
  blacklistedTokens.add(tokenHash)
}

export function checkBlacklist(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next()
  }

  const token = authHeader.split(" ")[1]
  const tokenHash = token.substring(0, 16)

  if (blacklistedTokens.has(tokenHash)) {
    res.status(401).json({ error: "Sessão revogada." })
    return
  }

  next()
}
