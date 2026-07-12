import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"

const router = Router()

const REQUIRED_NUMERIC_FIELDS = [
  "underruns",
  "droppedFrames",
  "cpuLoad",
  "peakCpu",
  "timestamp",
] as const

export interface TelemetryPayload {
  metrics: Record<string, unknown>
  userAgent?: string
  platform?: string
  projectId?: string
}

export function validateTelemetryPayload(body: unknown): body is TelemetryPayload {
  if (!body || typeof body !== "object") return false
  const { metrics } = body as Record<string, unknown>
  if (!metrics || typeof metrics !== "object") return false
  for (const field of REQUIRED_NUMERIC_FIELDS) {
    if (typeof (metrics as Record<string, unknown>)[field] !== "number") {
      return false
    }
  }
  return true
}

async function persistTelemetry(payload: TelemetryPayload): Promise<void> {
  try {
    const { error } = await supabase.from("telemetry").insert({
      project_id: payload.projectId ?? null,
      user_agent: payload.userAgent ?? "unknown",
      platform: payload.platform ?? "unknown",
      metrics: payload.metrics,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  } catch (e) {
    console.log("[telemetry] log (no persist):", {
      projectId: payload.projectId,
      platform: payload.platform,
      userAgent: payload.userAgent,
      metrics: payload.metrics,
    })
  }
}

router.post("/telemetry", async (req: Request, res: Response) => {
  if (!validateTelemetryPayload(req.body)) {
    return res.status(400).json({ error: "Invalid telemetry payload" })
  }
  await persistTelemetry(req.body)
  res.json({ ok: true })
})

export default router
