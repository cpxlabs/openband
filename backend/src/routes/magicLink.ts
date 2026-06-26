import { Router, Request, Response } from "express"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { supabase } from "../lib/supabase"

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || "openband_jwt_secret_dev"
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

const tokenStore = new Map<string, { email: string; expiresAt: number }>()

function cleanupExpired() {
  const now = Date.now()
  for (const [token, entry] of tokenStore) {
    if (now > entry.expiresAt) {
      tokenStore.delete(token)
    }
  }
}

function signToken(userId: string, tier: string): string {
  return jwt.sign({ userId, tier }, JWT_SECRET, { expiresIn: "7d" })
}

async function createSession(userId: string, token: string, req: Request) {
  const tokenHash = token.substring(0, 16)
  const userAgent = req.headers["user-agent"] || null
  const ipAddress = req.ip || req.socket.remoteAddress || null
  const deviceName = userAgent ? userAgent.substring(0, 120) : null

  await supabase.from("user_sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    device_name: deviceName,
    ip_address: ipAddress,
    user_agent: userAgent,
  })
}

router.post("/auth/magic-link", async (req: Request, res: Response) => {
  try {
    cleanupExpired()

    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório." })
    }

    const token = crypto.randomBytes(32).toString("hex")
    tokenStore.set(token, { email, expiresAt: Date.now() + MAGIC_LINK_TTL_MS })

    const callbackUrl = `${req.protocol}://${req.get("host")}/api/auth/magic-callback?token=${token}`
    console.log(`[Magic Link] ${email}: ${callbackUrl}`)

    res.json({ message: "Magic link enviado. Verifique o console do servidor." })
  } catch (e) {
    console.error("Magic link request failed:", e)
    res.status(500).json({ error: "Falha ao gerar magic link." })
  }
})

router.get("/auth/magic-callback", async (req: Request, res: Response) => {
  try {
    cleanupExpired()

    const { token } = req.query
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token inválido." })
    }

    const entry = tokenStore.get(token)
    if (!entry) {
      return res.status(401).json({ error: "Token inválido ou expirado." })
    }

    if (Date.now() > entry.expiresAt) {
      tokenStore.delete(token)
      return res.status(401).json({ error: "Token expirado." })
    }

    tokenStore.delete(token)

    const { email } = entry

    let { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (!user) {
      const { data: newUser, error } = await supabase
        .from("profiles")
        .insert({ email, name: email.split("@")[0], tier: "FREE" })
        .select()
        .single()

      if (error) throw error
      user = newUser
    }

    const jwtToken = signToken(user.id, user.tier || "FREE")
    await createSession(user.id, jwtToken, req)

    res.json({
      token: jwtToken,
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, avatar_url: user.avatar_url },
    })
  } catch (e) {
    console.error("Magic callback failed:", e)
    res.status(500).json({ error: "Falha na autenticação via magic link." })
  }
})

export default router
