import type { ApprovedStarterSnapshot } from "./snapshotPromotion";

export interface HistoryEntry {
  id: string;
  snapshot: ApprovedStarterSnapshot;
  previewUri: string | null;
}

export interface VariationHistoryOptions {
  defaultKeep?: number;
  hardMax?: number;
  onEvict?: (entry: HistoryEntry) => void;
}

export class VariationHistory {
  private entriesArr: HistoryEntry[] = [];
  private selectedId: string | null = null;
  private readonly defaultKeep: number;
  private readonly hardMax: number;
  private readonly onEvict?: (entry: HistoryEntry) => void;

  constructor(opts: VariationHistoryOptions = {}) {
    this.defaultKeep = opts.defaultKeep ?? 3;
    this.hardMax = opts.hardMax ?? 5;
    this.onEvict = opts.onEvict;
  }

  push(entry: HistoryEntry): void {
    this.entriesArr.push(entry);
    this.selectedId = entry.id;
    this.evictIfNeeded();
  }

  select(id: string): void {
    if (this.entriesArr.some((e) => e.id === id)) this.selectedId = id;
  }

  get selected(): HistoryEntry | null {
    return this.entriesArr.find((e) => e.id === this.selectedId) ?? null;
  }

  get entries(): HistoryEntry[] {
    return this.entriesArr;
  }

  get selectedIdValue(): string | null {
    return this.selectedId;
  }

  get defaultKeepValue(): number {
    return this.defaultKeep;
  }

  reset(): void {
    if (this.onEvict) this.entriesArr.forEach((e) => this.onEvict!(e));
    this.entriesArr = [];
    this.selectedId = null;
  }

  private evictIfNeeded(): void {
    while (this.entriesArr.length > this.hardMax) {
      const idx = this.entriesArr.findIndex((e) => e.id !== this.selectedId);
      if (idx === -1) break;
      const [removed] = this.entriesArr.splice(idx, 1);
      if (removed && this.onEvict) this.onEvict(removed);
    }
  }
}
