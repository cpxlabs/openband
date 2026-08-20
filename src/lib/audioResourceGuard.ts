export interface AudioContextLike {
  readonly id: string;
  setVolume(v: number): void;
}

export interface PreviewParams {
  key?: string;
  bpm?: number;
  volume?: number;
  seed?: string;
}

export interface PreviewVoice {
  play(): void | Promise<void>;
  stop(): void;
  dispose(): void;
}

export interface PreviewVoiceFactory {
  create(ctx: AudioContextLike, params: PreviewParams): PreviewVoice;
}

export interface AudioResourceGuardOptions {
  context: AudioContextLike;
  factory: PreviewVoiceFactory;
  maxVoices?: number;
  defaultVolume?: number;
}

interface ManagedVoice {
  token: number;
  params: PreviewParams;
  voice: PreviewVoice;
  stopped: boolean;
}

export class AudioResourceGuard {
  private context: AudioContextLike;
  private factory: PreviewVoiceFactory;
  private maxVoices: number;
  private defaultVol: number;
  private voices = new Map<number, ManagedVoice>();
  private seq = 0;

  constructor(opts: AudioResourceGuardOptions) {
    this.context = opts.context;
    this.factory = opts.factory;
    this.maxVoices = opts.maxVoices ?? 4;
    this.defaultVol = opts.defaultVolume ?? 1;
  }

  get activeCount(): number {
    return this.voices.size;
  }

  get defaultVolume(): number {
    return this.defaultVol;
  }

  setDefaultVolume(v: number): void {
    this.defaultVol = v;
  }

  preview(params: PreviewParams): number {
    const token = ++this.seq;
    const voice = this.factory.create(this.context, params);
    this.voices.set(token, { token, params, voice, stopped: false });
    this.enforceMax();
    try {
      voice.play();
    } catch {
      this.release(token);
    }
    return token;
  }

  play(token: number): void {
    const m = this.voices.get(token);
    if (!m || m.stopped) return;
    try {
      m.voice.play();
    } catch {}
  }

  stop(token: number): void {
    const m = this.voices.get(token);
    if (!m || m.stopped) return;
    this.release(token);
  }

  invalidate(changed: { key?: string; bpm?: number }): void {
    for (const m of Array.from(this.voices.values())) {
      const keyDiff = changed.key !== undefined && m.params.key !== changed.key;
      const bpmDiff = changed.bpm !== undefined && m.params.bpm !== changed.bpm;
      if (keyDiff || bpmDiff) this.release(m.token);
    }
  }

  stopAll(): void {
    for (const t of Array.from(this.voices.keys())) this.release(t);
    this.restoreVolume();
  }

  restoreVolume(): void {
    this.context.setVolume(this.defaultVol);
  }

  dispose(): void {
    this.stopAll();
  }

  private release(token: number): void {
    const m = this.voices.get(token);
    if (!m) return;
    if (!m.stopped) {
      try {
        m.voice.stop();
      } catch {}
      m.stopped = true;
    }
    try {
      m.voice.dispose();
    } catch {}
    this.voices.delete(token);
  }

  private enforceMax(): void {
    while (this.voices.size > this.maxVoices) {
      let oldest = -1;
      for (const k of this.voices.keys()) {
        if (oldest === -1 || k < oldest) oldest = k;
      }
      if (oldest === -1) break;
      this.release(oldest);
    }
  }
}
