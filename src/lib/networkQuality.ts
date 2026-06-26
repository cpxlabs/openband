import { Platform } from "react-native"

export type NetworkQuality = "low" | "medium" | "high" | "offline"

export interface NetworkInfo {
  quality: NetworkQuality
  rtt: number
  downlink: number
  effectiveType: string
}

export function detectNetworkQuality(): NetworkInfo {
  if (Platform.OS !== "web") {
    return { quality: "high", rtt: 0, downlink: 10, effectiveType: "4g" }
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (!conn) {
    return { quality: "high", rtt: 0, downlink: 10, effectiveType: "4g" }
  }

  const rtt = conn.rtt || 0
  const downlink = conn.downlink || 10
  const effectiveType = conn.effectiveType || "4g"

  let quality: NetworkQuality = "high"
  if (!navigator.onLine) quality = "offline"
  else if (effectiveType === "slow-2g" || effectiveType === "2g" || rtt > 500) quality = "low"
  else if (effectiveType === "3g" || rtt > 200) quality = "medium"

  return { quality, rtt, downlink, effectiveType }
}

export function getAudioFormat(quality: NetworkQuality): string {
  switch (quality) {
    case "low": return "opus"
    case "medium": return "opus"
    case "high": return "wav"
    case "offline": return "wav"
  }
}

export function getBitrate(quality: NetworkQuality): number {
  switch (quality) {
    case "low": return 64
    case "medium": return 128
    case "high": return 320
    case "offline": return 320
  }
}
