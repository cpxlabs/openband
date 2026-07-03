import { Router, Request, Response } from "express"
import { getTierLimits, PlanTier } from "../middleware/tierGuard"

const router = Router()

router.get("/user/tier", (req: Request, res: Response) => {
  const tierHeader = (req.headers["x-user-tier"] as string) || "FREE"
  const tier = (["FREE", "TIER1_LIVE", "TIER2_STUDIO"].includes(tierHeader) ? tierHeader : "FREE") as PlanTier
  const limits = getTierLimits(tier)
  res.json({ tier, limits })
})

export default router
