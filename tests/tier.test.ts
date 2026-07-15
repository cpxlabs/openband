import { describe, it, expect } from "vitest";
import {
  getTierLimits,
  checkTierAccess,
  FREE_TIER_LIMITS,
  TIER_LIMITS,
} from "../src/lib/tier";

describe("tier helpers", () => {
  it("getTierLimits('FREE') disables canExportVideo", () => {
    const limits = getTierLimits("FREE");
    expect(limits.canExportVideo).toBe(false);
    expect(limits.canCreateRemixes).toBe(false);
    expect(limits.canPublishToFeed).toBe(false);
  });

  it("getTierLimits('TIER1_LIVE') enables canExportVideo", () => {
    const limits = getTierLimits("TIER1_LIVE");
    expect(limits.canExportVideo).toBe(true);
    expect(limits.canCreateRemixes).toBe(true);
    expect(limits.canPublishToFeed).toBe(true);
  });

  it("getTierLimits falls back to FREE for unknown tiers", () => {
    expect(getTierLimits("NOPE" as any)).toEqual(FREE_TIER_LIMITS);
  });

  it("checkTierAccess returns the boolean limit for a feature", () => {
    expect(checkTierAccess("FREE", "canExportVideo")).toBe(false);
    expect(checkTierAccess("TIER1_LIVE", "canExportVideo")).toBe(true);
    expect(checkTierAccess("TIER2_STUDIO", "canCreateRemixes")).toBe(true);
    expect(checkTierAccess("FREE", "canPublishToFeed")).toBe(false);
  });

  it("TIER_LIMITS covers all tiers", () => {
    expect(Object.keys(TIER_LIMITS).sort()).toEqual([
      "FREE",
      "TIER1_LIVE",
      "TIER2_STUDIO",
    ]);
  });

  it("FREE_TIER_LIMITS matches documented defaults", () => {
    expect(FREE_TIER_LIMITS).toEqual({
      maxTracks: 4,
      maxProjects: 3,
      maxStemExports: 2,
      canUseTriton: false,
      canUseJuno: true,
      canExportVideo: false,
      canPublishToFeed: false,
      canCreateRemixes: false,
    });
  });
});
