import { audioSystem } from "./universalAudio";
import { renderTrackStem } from "./midiSynth";
import type { TrackDef } from "./types";

const MAX_STEMS = 32;

interface StemEntry {
  buffer: AudioBuffer;
  hash: string;
  lastUsed: number;
}

interface TrackNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

export class PlaybackEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stems = new Map<string, StemEntry>();
  private nodes = new Map<string, TrackNode>();
  private meta = new Map<string, TrackDef>();
  private muteState = new Map<string, boolean>();
  private soloState = new Map<string, boolean>();
  duration = 0;
  isPlaying = false;
  private startCtxTime = 0;
  private pausedAt = 0;
  private loopA: number | null = null;
  private loopB: number | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  onEnded: (() => void) | null = null;

  get stemCount(): number {
    return this.stems.size;
  }

  hashTrack(track: TrackDef, bpm: number): string {
    const automation = track.automation ?? {};
    return JSON.stringify({
      m: track.midiNotes ?? [],
      r: (track.regions ?? []).map((rg) => ({
        id: rg.id,
        start: rg.start,
        dur: rg.duration,
        url: rg.url,
      })),
      p: track.plugins ?? [],
      a: automation,
      v: track.volume,
      pan: track.pan,
      bpm,
    });
  }

  private computeAnySolo(): boolean {
    for (const [id, t] of this.meta) {
      const solo = this.soloState.get(id) ?? t.solo;
      if (solo) return true;
    }
    return false;
  }

  private isAudible(t: TrackDef): boolean {
    const anySolo = this.computeAnySolo();
    const muted = this.muteState.get(t.id) ?? t.muted;
    const solo = this.soloState.get(t.id) ?? t.solo;
    if (anySolo) return !!solo;
    return !muted;
  }

  private hasVolAuto(t: TrackDef): boolean {
    return !!((t.automation ?? {}).volume?.length);
  }

  private hasPanAuto(t: TrackDef): boolean {
    return !!((t.automation ?? {}).pan?.length);
  }

  private liveGainValue(t: TrackDef): number {
    return this.hasVolAuto(t) ? 1 : (t.volume ?? 100) / 100;
  }

  private livePanValue(t: TrackDef): number {
    return this.hasPanAuto(t) ? 0 : (t.pan ?? 0) / 100;
  }

  async prepare(
    tracks: TrackDef[],
    bpm: number,
    duration: number,
    _beatsPerMeasure: number,
  ): Promise<void> {
    const ctx = await audioSystem.ensureContext();
    if (!ctx) throw new Error("AudioContext unavailable");
    this.ctx = ctx;
    this.duration = duration;

    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(ctx.destination);
    }

    const incoming = new Set(tracks.map((t) => t.id));
    for (const id of Array.from(this.stems.keys())) {
      if (!incoming.has(id)) this.disposeStem(id);
    }

    this.muteState.clear();
    this.soloState.clear();
    this.meta.clear();
    for (const t of tracks) {
      this.muteState.set(t.id, !!t.muted);
      this.soloState.set(t.id, !!t.solo);
      this.meta.set(t.id, t);
    }

    for (const t of tracks) {
      const hash = this.hashTrack(t, bpm);
      const existing = this.stems.get(t.id);
      if (existing && existing.hash === hash) {
        existing.lastUsed = Date.now();
        continue;
      }
      const buffer = await renderTrackStem(t, bpm, duration, undefined);
      if (!buffer) {
        this.stems.delete(t.id);
        continue;
      }
      this.stems.set(t.id, { buffer, hash, lastUsed: Date.now() });
    }
    this.evictLRU();
  }

  private buildNode(t: TrackDef): TrackNode | null {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;
    const stem = this.stems.get(t.id);
    if (!stem) return null;

    const source = ctx.createBufferSource();
    source.buffer = stem.buffer;
    const gain = ctx.createGain();
    gain.gain.value = this.isAudible(t) ? this.liveGainValue(t) : 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = this.livePanValue(t);

    source.connect(gain);
    gain.connect(panner);
    panner.connect(master);
    source.onended = () => this.handleEnded(t.id);
    return { source, gain, panner };
  }

  play(seekSec = 0): void {
    if (!this.ctx) throw new Error("PlaybackEngine not prepared");
    this.stopSources();
    this.startCtxTime = this.ctx.currentTime - seekSec;
    this.isPlaying = true;

    for (const [id, t] of this.meta) {
      const node = this.buildNode(t);
      if (!node) continue;
      this.nodes.set(id, node);
      try {
        const src = node.source;
        if (
          this.loopA !== null &&
          this.loopB !== null &&
          this.loopB > this.loopA
        ) {
          const span = this.loopB - this.loopA;
          const offset =
            this.loopA + (((seekSec - this.loopA) % span) + span) % span;
          src.loop = true;
          src.loopStart = this.loopA;
          src.loopEnd = this.loopB;
          src.start(0, offset);
        } else {
          src.start(0, Math.max(0, seekSec));
        }
      } catch (e) {
        console.warn("Failed to start source for", t.id, e);
      }
    }

    if (this.loopA === null || this.loopB === null) {
      const remaining = Math.max(0, this.duration - seekSec);
      this.endTimer = setTimeout(
        () => {
          this.isPlaying = false;
          this.pausedAt = this.duration;
          this.onEnded?.();
        },
        remaining * 1000 + 60,
      );
    }
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();
    this.stopSources();
    this.isPlaying = false;
  }

  stop(): void {
    this.stopSources();
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  seek(sec: number): void {
    const target = Math.max(0, Math.min(this.duration, sec));
    if (this.isPlaying) {
      this.play(target);
    } else {
      this.pausedAt = target;
    }
  }

  getCurrentTime(): number {
    if (!this.ctx || !this.isPlaying) return this.pausedAt;
    return Math.max(0, Math.min(this.duration, this.ctx.currentTime - this.startCtxTime));
  }

  setMuted(trackId: string, muted: boolean): void {
    this.muteState.set(trackId, muted);
    this.applyAudibility();
  }

  setSolo(trackId: string, solo: boolean): void {
    this.soloState.set(trackId, solo);
    this.applyAudibility();
  }

  private applyAudibility(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [id, t] of this.meta) {
      const node = this.nodes.get(id);
      if (!node) continue;
      const target = this.isAudible(t) ? this.liveGainValue(t) : 0;
      node.gain.gain.setTargetAtTime(target, now, 0.01);
    }
  }

  setTrackVolume(trackId: string, vol: number): void {
    const t = this.meta.get(trackId);
    const node = this.nodes.get(trackId);
    if (!t || !node || !this.ctx) return;
    if (this.hasVolAuto(t)) return;
    node.gain.gain.setTargetAtTime(vol / 100, this.ctx.currentTime, 0.01);
  }

  setTrackPan(trackId: string, pan: number): void {
    const t = this.meta.get(trackId);
    const node = this.nodes.get(trackId);
    if (!t || !node || !this.ctx) return;
    if (this.hasPanAuto(t)) return;
    node.panner.pan.setTargetAtTime(pan / 100, this.ctx.currentTime, 0.01);
  }

  setLoop(a: number | null, b: number | null): void {
    this.loopA = a;
    this.loopB = b;
    if (this.isPlaying) {
      const seek = this.getCurrentTime();
      this.play(seek);
    }
  }

  async syncTracks(
    tracks: TrackDef[],
    bpm: number,
    duration: number,
  ): Promise<void> {
    if (!this.ctx) return;
    const wasPlaying = this.isPlaying;
    const seek = this.getCurrentTime();
    this.duration = duration;

    const incoming = new Set(tracks.map((t) => t.id));
    for (const id of Array.from(this.stems.keys())) {
      if (!incoming.has(id)) this.disposeStem(id);
    }

    this.muteState.clear();
    this.soloState.clear();
    this.meta.clear();
    for (const t of tracks) {
      this.muteState.set(t.id, !!t.muted);
      this.soloState.set(t.id, !!t.solo);
      this.meta.set(t.id, t);
    }

    for (const t of tracks) {
      const hash = this.hashTrack(t, bpm);
      const existing = this.stems.get(t.id);
      if (existing && existing.hash === hash) {
        existing.lastUsed = Date.now();
        continue;
      }
      const buffer = await renderTrackStem(t, bpm, duration, undefined);
      if (!buffer) {
        this.stems.delete(t.id);
        continue;
      }
      this.stems.set(t.id, { buffer, hash, lastUsed: Date.now() });
    }
    this.evictLRU();

    if (wasPlaying) this.play(seek);
  }

  private handleEnded(_trackId: string): void {
    if (!this.isPlaying) return;
    if (this.loopA !== null && this.loopB !== null) return;
  }

  private evictLRU(): void {
    while (this.stems.size > MAX_STEMS) {
      let oldestId: string | null = null;
      let oldest = Infinity;
      for (const [id, s] of this.stems) {
        if (this.nodes.has(id)) continue;
        if (s.lastUsed < oldest) {
          oldest = s.lastUsed;
          oldestId = id;
        }
      }
      if (oldestId == null) break;
      this.disposeStem(oldestId);
    }
  }

  private disposeStem(id: string): void {
    this.stems.delete(id);
    const node = this.nodes.get(id);
    if (node) {
      try {
        node.source.onended = null;
        node.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.source.disconnect();
        node.gain.disconnect();
        node.panner.disconnect();
      } catch {
        /* already disconnected */
      }
      this.nodes.delete(id);
    }
  }

  private stopSources(): void {
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    for (const [, node] of this.nodes) {
      try {
        node.source.onended = null;
        node.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.source.disconnect();
        node.gain.disconnect();
        node.panner.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.nodes.clear();
  }

  dispose(): void {
    this.stopSources();
    if (this.master) {
      try {
        this.master.disconnect();
      } catch {
        /* ignore */
      }
      this.master = null;
    }
    this.stems.clear();
    this.meta.clear();
    this.muteState.clear();
    this.soloState.clear();
    this.isPlaying = false;
    this.ctx = null;
  }
}
