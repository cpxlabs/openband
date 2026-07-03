import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { getJwtSecret } from "../config/jwt"

export interface AuthenticatedRequest extends Request {
  userTokenData?: { userId: string; tier: string }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Acesso negado. Token não fornecido." })
    return
  }

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; tier: string }
    req.userTokenData = decoded
    next()
  } catch {
    res.status(401).json({ error: "Sessão expirada ou Token inválido." })
  }
}
