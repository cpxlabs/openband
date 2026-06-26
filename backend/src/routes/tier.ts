import { Router, Request, Response } from "express"
import { getTierLimits } from "../middleware/tierGuard"

const router = Router()

router.get("/user/tier", (req: Request, res: Response) => {
  const tier = (req.headers["x-user-tier"] as string) || "FREE"
  const limits = getTierLimits(tier as any)
  res.json({ tier, limits })
})

export default router
