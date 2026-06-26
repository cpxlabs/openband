export interface HumanizedHit {
  finalVelocity: number
  finalTime: number
}

export function humanizeDrumHit(baseVelocity: number, baseTime: number): HumanizedHit {
  const velocityRandomness = (Math.random() - 0.5) * 10
  const finalVelocity = Math.max(1, Math.min(127, baseVelocity + velocityRandomness))
  const timingOffsetSeconds = (Math.random() - 0.5) * 0.008
  const finalTime = baseTime + timingOffsetSeconds
  return { finalVelocity, finalTime }
}

export function humanizeDrumPattern(hits: { pitch: number; start: number; duration: number; velocity: number }[]) {
  return hits.map(hit => {
    const { finalVelocity, finalTime } = humanizeDrumHit(hit.velocity, hit.start)
    return { ...hit, start: finalTime, velocity: Math.round(finalVelocity) }
  })
}
