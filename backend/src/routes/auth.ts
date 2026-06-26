import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import { supabase } from "../lib/supabase"

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || "openband_jwt_secret_dev"
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""

function signToken(userId: string, tier: string): string {
  return jwt.sign({ userId, tier }, JWT_SECRET, { expiresIn: "7d" })
}

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." })
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ error: "Este e-mail já está em uso." })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: newUser, error } = await supabase
      .from("profiles")
      .insert({ email, name, password_hash: passwordHash, tier: "FREE" })
      .select()
      .single()

    if (error) throw error

    const token = signToken(newUser.id, newUser.tier || "FREE")
    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, tier: newUser.tier },
    })
  } catch (e) {
    console.error("Register failed:", e)
    res.status(500).json({ error: "Falha interna no registro." })
  }
})

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." })
    }

    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (error) throw error

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Credenciais inválidas ou usuário registrado via Google." })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais inválidas." })
    }

    const token = signToken(user.id, user.tier || "FREE")
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, avatar_url: user.avatar_url },
    })
  } catch (e) {
    console.error("Login failed:", e)
    res.status(500).json({ error: "Falha interna no login." })
  }
})

router.post("/auth/google", async (req: Request, res: Response) => {
  try {
    const { googleToken } = req.body
    if (!googleToken) {
      return res.status(400).json({ error: "Token do Google é obrigatório." })
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google OAuth não configurado no servidor." })
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ idToken: googleToken, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()

    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Token de autenticação do Google inválido." })
    }

    const { email, name, sub: googleId, picture: avatarUrl } = payload

    let { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (!user) {
      const { data: newUser, error } = await supabase
        .from("profiles")
        .insert({ email, name, google_id: googleId, avatar_url: avatarUrl, tier: "FREE" })
        .select()
        .single()

      if (error) throw error
      user = newUser
    } else if (!user.google_id) {
      const { data: updated, error } = await supabase
        .from("profiles")
        .update({ google_id: googleId, avatar_url: avatarUrl })
        .eq("id", user.id)
        .select()
        .single()

      if (error) throw error
      user = updated
    }

    const token = signToken(user.id, user.tier || "FREE")
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, tier: user.tier },
    })
  } catch (e) {
    console.error("Google auth failed:", e)
    res.status(500).json({ error: "Falha na autenticação via Google." })
  }
})

router.get("/auth/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido." })
    }

    const token = authHeader.split(" ")[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; tier: string }

    const { data: user, error } = await supabase
      .from("profiles")
      .select("id, email, name, avatar_url, tier")
      .eq("id", decoded.userId)
      .maybeSingle()

    if (error || !user) {
      return res.status(401).json({ error: "Sessão expirada." })
    }

    res.json({ user })
  } catch (e) {
    res.status(401).json({ error: "Sessão expirada ou Token inválido." })
  }
})

router.post("/auth/convert-visitor", async (req: Request, res: Response) => {
  try {
    const { email, password, name, visitorId } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." })
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ error: "Este e-mail já está em uso." })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: newUser, error: createError } = await supabase
      .from("profiles")
      .insert({ email, name, password_hash: passwordHash, tier: "FREE" })
      .select()
      .single()

    if (createError) throw createError

    if (visitorId) {
      const { error: transferError } = await supabase
        .from("projects")
        .update({ user_id: newUser.id })
        .eq("user_id", visitorId)

      if (transferError) {
        console.warn("Failed to transfer visitor projects:", transferError)
      }
    }

    const token = signToken(newUser.id, newUser.tier || "FREE")
    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, tier: newUser.tier },
    })
  } catch (e) {
    console.error("Convert visitor failed:", e)
    res.status(500).json({ error: "Falha ao criar conta." })
  }
})

export default router
