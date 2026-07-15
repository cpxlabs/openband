export type PlanTier = "FREE" | "TIER1_LIVE" | "TIER2_STUDIO";

export interface TierLimits {
  maxTracks: number;
  maxProjects: number;
  maxStemExports: number;
  canUseTriton: boolean;
  canUseJuno: boolean;
  canExportVideo: boolean;
  canPublishToFeed: boolean;
  canCreateRemixes: boolean;
}

export const FREE_TIER_LIMITS: TierLimits = {
  maxTracks: 4,
  maxProjects: 3,
  maxStemExports: 2,
  canUseTriton: false,
  canUseJuno: true,
  canExportVideo: false,
  canPublishToFeed: false,
  canCreateRemixes: false,
};

const TIER1_LIVE_LIMITS: TierLimits = {
  maxTracks: 12,
  maxProjects: 20,
  maxStemExports: 20,
  canUseTriton: true,
  canUseJuno: true,
  canExportVideo: true,
  canPublishToFeed: true,
  canCreateRemixes: true,
};

const TIER2_STUDIO_LIMITS: TierLimits = {
  maxTracks: 48,
  maxProjects: Infinity as number,
  maxStemExports: Infinity as number,
  canUseTriton: true,
  canUseJuno: true,
  canExportVideo: true,
  canPublishToFeed: true,
  canCreateRemixes: true,
};

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  FREE: FREE_TIER_LIMITS,
  TIER1_LIVE: TIER1_LIVE_LIMITS,
  TIER2_STUDIO: TIER2_STUDIO_LIMITS,
};

export function getTierLimits(tier: PlanTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.FREE;
}

export function checkTierAccess(tier: PlanTier, feature: keyof TierLimits): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];
  if (typeof value === "boolean") return value;
  return true;
}
