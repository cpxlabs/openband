export interface MidiEvent {
  type: string
  note?: number
  velocity?: number
  value?: number
  timestamp: number
}

const DEDUP_WINDOW_MS = 10

export class MidiDedupFilter {
  private lastEvents: Map<string, MidiEvent> = new Map()
  private droppedCount = 0

  process(event: MidiEvent): MidiEvent | null {
    const key = `${event.type}:${event.note ?? ""}`
    const last = this.lastEvents.get(key)

    if (last && event.timestamp - last.timestamp < DEDUP_WINDOW_MS) {
      if (event.value !== undefined && last.value !== undefined && event.value === last.value) {
        this.droppedCount++
        return null
      }
    }

    this.lastEvents.set(key, event)
    return event
  }

  processBatch(events: MidiEvent[]): MidiEvent[] {
    const result: MidiEvent[] = []
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
    for (const e of sorted) {
      const filtered = this.process(e)
      if (filtered) result.push(filtered)
    }
    return result
  }

  getDroppedCount(): number {
    return this.droppedCount
  }

  reset(): void {
    this.lastEvents.clear()
    this.droppedCount = 0
  }
}

export function deduplicateMidiEvents(events: MidiEvent[]): MidiEvent[] {
  const filter = new MidiDedupFilter()
  return filter.processBatch(events)
}