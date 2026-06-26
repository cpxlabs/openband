import { Request, Response, NextFunction } from "express"

export type PlanTier = "FREE" | "TIER1_LIVE" | "TIER2_STUDIO"

interface TierLimits {
  maxTracks: number
  maxProjects: number
  maxStemExports: number
  canUseTriton: boolean
  canUseJuno: boolean
  canExportVideo: boolean
  canPublishToFeed: boolean
  canCreateRemixes: boolean
}

const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  FREE: {
    maxTracks: 4, maxProjects: 3, maxStemExports: 2,
    canUseTriton: false, canUseJuno: true, canExportVideo: false,
    canPublishToFeed: false, canCreateRemixes: false,
  },
  TIER1_LIVE: {
    maxTracks: 12, maxProjects: 20, maxStemExports: 20,
    canUseTriton: true, canUseJuno: true, canExportVideo: true,
    canPublishToFeed: true, canCreateRemixes: true,
  },
  TIER2_STUDIO: {
    maxTracks: 48, maxProjects: Infinity as number, maxStemExports: Infinity as number,
    canUseTriton: true, canUseJuno: true, canExportVideo: true,
    canPublishToFeed: true, canCreateRemixes: true,
  },
}

function getTierFromRequest(req: Request): PlanTier {
  const tier = (req.headers["x-user-tier"] as string) || "FREE"
  return (["FREE", "TIER1_LIVE", "TIER2_STUDIO"].includes(tier) ? tier : "FREE") as PlanTier
}

export function requireTier(minimumTier: PlanTier) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tier = getTierFromRequest(req)
    const tiers: PlanTier[] = ["FREE", "TIER1_LIVE", "TIER2_STUDIO"]
    if (tiers.indexOf(tier) < tiers.indexOf(minimumTier)) {
      return res.status(403).json({ error: `Plano ${tier} não permite esta operação. Upgrade para ${minimumTier}.` })
    }
    next()
  }
}

export function checkTierAccess(tier: PlanTier, resource: keyof TierLimits): boolean {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE
  const value = limits[resource]
  if (typeof value === "boolean") return value
  return true
}

export function getTierLimits(tier: PlanTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.FREE
}

export function requireFeature(feature: keyof TierLimits) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tier = getTierFromRequest(req)
    if (!checkTierAccess(tier, feature)) {
      return res.status(403).json({ error: `Recurso '${feature}' não disponível no plano ${tier}.` })
    }
    next()
  }
}
