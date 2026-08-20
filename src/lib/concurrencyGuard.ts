export interface RunOutcome<T> {
  id: number;
  result: T;
  applied: boolean;
  stale: boolean;
}

export interface ConcurrencyGuardOptions {
  onDispose?: (id: number) => void;
}

export class ConcurrencyGuard<T = unknown> {
  private counter = 0;
  private approvedId: number | null = null;
  private disposed = false;
  private live = new Set<number>();
  private disposedFired = new Set<number>();
  private onDispose?: (id: number) => void;

  constructor(opts?: ConcurrencyGuardOptions) {
    this.onDispose = opts?.onDispose;
  }

  get latestId(): number {
    return this.counter;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  async run(task: () => Promise<T>): Promise<RunOutcome<T>> {
    const id = ++this.counter;
    this.live.add(id);
    let result: T;
    try {
      result = await task();
    } finally {
      this.live.delete(id);
    }
    const applied =
      !this.disposed &&
      (id === this.approvedId ||
        (this.approvedId === null && id === this.latestId));
    if (!applied && !this.disposedFired.has(id)) {
      this.disposedFired.add(id);
      this.onDispose?.(id);
    }
    this.disposedFired.delete(id);
    return { id, result, applied, stale: !applied };
  }

  approve(id: number): void {
    this.approvedId = id;
  }

  cancelInFlight(): void {
    const liveIds = Array.from(this.live);
    this.live.clear();
    for (const id of liveIds) {
      if (id === this.approvedId) continue;
      if (!this.disposedFired.has(id)) {
        this.disposedFired.add(id);
        this.onDispose?.(id);
      }
    }
    this.counter++;
  }

  dispose(): void {
    this.disposed = true;
    this.cancelInFlight();
  }
}
