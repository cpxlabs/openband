export interface ScheduledEvent {
  time: number
  callback: () => void
  id: string
}

export class LookAheadScheduler {
  private ctx: AudioContext
  private events: ScheduledEvent[] = []
  private timerId: ReturnType<typeof setTimeout> | null = null
  private lookAheadMs: number
  private isRunning: boolean = false

  constructor(ctx: AudioContext, lookAheadMs: number = 35) {
    this.ctx = ctx
    this.lookAheadMs = lookAheadMs
  }

  schedule(callback: () => void, time: number): string {
    const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    this.events.push({ time, callback, id })
    this.events.sort((a, b) => a.time - b.time)
    return id
  }

  cancel(id: string): void {
    this.events = this.events.filter(e => e.id !== id)
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.tick()
  }

  stop(): void {
    this.isRunning = false
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.events = []
  }

  clear(): void {
    this.events = []
  }

  private tick(): void {
    if (!this.isRunning) return

    const now = this.ctx.currentTime
    const scheduleUntil = now + this.lookAheadMs / 1000

    while (this.events.length > 0 && this.events[0].time <= scheduleUntil) {
      const event = this.events.shift()!
      try {
        event.callback()
      } catch (e) {
        console.warn("Scheduled event error:", e)
      }
    }

    this.timerId = setTimeout(() => this.tick(), this.lookAheadMs / 2)
  }
}
