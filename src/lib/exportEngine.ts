import { Platform } from "react-native";
import type { TrackDef } from "./types";
import type { Mood } from "./projectTemplates";
import { MOODS } from "./projectTemplates";
import { audioBufferToWavBlob } from "./audio";

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export interface ExportSnapshot {
  exportedAt: number;
  trackCount: number;
  volumeHash: string;
  duration: number;
  bpm: number;
}

export interface ExportEngineOptions {
  bpm: number;
  sampleRate?: number;
  bitDepth?: 16 | 24 | 32;
  mood?: Mood;
  onProgress?: (percent: number) => void;
}

interface ExportEngineInternalOptions {
  bpm: number;
  sampleRate: number;
  bitDepth: 16 | 24 | 32;
  mood: Mood | undefined;
}

function computeSnapshotHash(tracks: TrackDef[]): string {
  let hash = 0;
  for (const t of tracks) {
    hash = ((hash << 5) - hash + t.volume) | 0;
    hash = ((hash << 5) - hash + (t.pan | 0)) | 0;
    hash = ((hash << 5) - hash + (t.muted ? 1 : 0)) | 0;
    hash = ((hash << 5) - hash + (t.solo ? 1 : 0)) | 0;
    if (t.midiNotes) {
      for (const n of t.midiNotes) {
        hash = ((hash << 5) - hash + n.pitch) | 0;
        hash = ((hash << 5) - hash + Math.round(n.start * 100)) | 0;
      }
    }
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function getTrackWaveform(name: string): OscillatorType {
  const l = name.toLowerCase();
  if (l.includes("bass") || l.includes("baixo") || l.includes("808")) return "sawtooth";
  if (l.includes("guitar") || l.includes("violão")) return "triangle";
  if (l.includes("piano") || l.includes("keys")) return "triangle";
  if (l.includes("pad")) return "sine";
  if (l.includes("synth") || l.includes("lead")) return "sawtooth";
  if (l.includes("sax") || l.includes("organ")) return "sawtooth";
  return "sawtooth";
}

function createNoiseBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function createReverbBuffer(ctx: OfflineAudioContext, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * decay);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * decay * 0.3));
  }
  return buf;
}

export class ExportEngine {
  private options: ExportEngineInternalOptions;
  private onProgress?: (percent: number) => void;
  private tracks: TrackDef[] = [];

  constructor(options: ExportEngineOptions) {
    this.options = {
      bpm: options.bpm,
      sampleRate: options.sampleRate ?? 44100,
      bitDepth: options.bitDepth ?? 24,
      mood: options.mood,
    };
    this.onProgress = options.onProgress;
  }

  setTracks(tracks: TrackDef[]): void {
    this.tracks = tracks;
  }

  buildSnapshot(): ExportSnapshot {
    return {
      exportedAt: Date.now(),
      trackCount: this.tracks.length,
      volumeHash: computeSnapshotHash(this.tracks),
      duration: this.calculateDuration(),
      bpm: this.options.bpm,
    };
  }

  private calculateDuration(): number {
    const beatDuration = 60 / Math.max(1, this.options.bpm);
    let totalBeats = 0;
    for (const track of this.tracks) {
      if (track.midiNotes) {
        for (const note of track.midiNotes) {
          const end = note.start + note.duration;
          if (end > totalBeats) totalBeats = end;
        }
      }
    }
    return totalBeats * beatDuration + 3;
  }

  async render(): Promise<{ blob: Blob; snapshot: ExportSnapshot } | null> {
    if (Platform.OS !== "web" || typeof OfflineAudioContext === "undefined") return null;

    const { bpm, sampleRate, mood } = this.options;
    const safeBpm = Math.max(1, bpm);
    const beatDuration = 60 / safeBpm;
    const moodPreset = mood ? MOODS.find((m) => m.id === mood) : undefined;

    const anySolo = this.tracks.some((t) => t.solo);
    const activeTracks = this.tracks.filter(
      (t) => !t.muted && (!anySolo || t.solo) && t.midiNotes?.length,
    );
    if (activeTracks.length === 0) return null;

    const totalBeats = this.calculateDuration() / beatDuration;
    const duration = totalBeats * beatDuration + 3;
    const numSamples = Math.ceil(sampleRate * duration);

    try {
      const ctx = new OfflineAudioContext(2, numSamples, sampleRate);
      let processedCount = 0;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.9;

      let masterOut: AudioNode = masterGain;

      if (moodPreset?.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = moodPreset.filter.type;
        filter.frequency.value = moodPreset.filter.freq;
        filter.Q.value = moodPreset.filter.q;
        masterGain.connect(filter);
        masterOut = filter;
      }

      if (moodPreset?.reverb && moodPreset.reverb.mix > 0) {
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1 - moodPreset.reverb.mix;
        const wetGain = ctx.createGain();
        wetGain.gain.value = moodPreset.reverb.mix;
        const convolver = ctx.createConvolver();
        convolver.buffer = createReverbBuffer(ctx, moodPreset.reverb.decay);

        masterOut.connect(dryGain);
        masterOut.connect(convolver);
        convolver.connect(wetGain);

        const merger = ctx.createGain();
        dryGain.connect(merger);
        wetGain.connect(merger);
        masterOut = merger;
      }

      masterOut.connect(ctx.destination);

      for (const track of activeTracks) {
        if (!track.midiNotes) continue;

        const trackGain = ctx.createGain();
        trackGain.gain.value = (track.volume ?? 80) / 127;

        const panNode = ctx.createStereoPanner();
        panNode.pan.value = (track.pan ?? 0) / 100;
        panNode.connect(trackGain);
        trackGain.connect(masterGain);

        for (const note of track.midiNotes) {
          const freq = NOTE_FREQS[note.pitch] || 440;
          const noteStart = note.start * beatDuration;
          const noteDur = note.duration * beatDuration;
          const vol = Math.max(0.01, note.velocity / 127) * 0.3;

          const isDrum =
            track.name.toLowerCase().includes("bateria") ||
            track.name.toLowerCase().includes("drums") ||
            track.name.toLowerCase().includes("percussão") ||
            track.name.toLowerCase().includes("percussion");

          if (isDrum) {
            const drumNode = ExportEngine.createDrumNode(ctx, note.pitch, noteStart, vol);
            drumNode.connect(panNode);
          } else {
            const osc = ctx.createOscillator();
            osc.type = getTrackWaveform(track.name);

            if (osc.type === "sawtooth" && track.name.toLowerCase().includes("bass")) {
              const filter = ctx.createBiquadFilter();
              filter.type = "lowpass";
              filter.frequency.value = 400;
              osc.connect(filter);
              filter.connect(trackGain);
            } else {
              osc.connect(trackGain);
            }

            osc.frequency.setValueAtTime(freq, noteStart);

            const noteGain = ctx.createGain();
            noteGain.gain.setValueAtTime(0, noteStart);
            noteGain.gain.linearRampToValueAtTime(vol, noteStart + 0.005);
            noteGain.gain.setValueAtTime(vol * 0.8, noteStart + noteDur * 0.7);
            noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur);

            osc.connect(noteGain);
            noteGain.connect(panNode);

            osc.start(noteStart);
            osc.stop(noteStart + noteDur + 0.05);
          }
        }

        processedCount++;
        this.onProgress?.(Math.round((processedCount / activeTracks.length) * 100));
      }

      const buffer = await ctx.startRendering();
      const blob = audioBufferToWavBlob(buffer, this.options.bitDepth);
      const snapshot = this.buildSnapshot();

      return { blob, snapshot };
    } catch (e) {
      console.error("ExportEngine render failed:", e);
      return null;
    }
  }

  private static createDrumNode(
    ctx: OfflineAudioContext,
    pitch: number,
    startTime: number,
    vol: number,
  ): AudioNode {
    const output = ctx.createGain();

    if (pitch === 36 || pitch === 35) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, startTime);
      osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.05);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.8, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.connect(gain);
      gain.connect(output);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    } else if (pitch === 38 || pitch === 40) {
      const noise = createNoiseBuffer(ctx, 0.15);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1000;
      bp.Q.value = 0.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.6, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(output);
      src.start(startTime);
      src.stop(startTime + 0.15);
    } else {
      const noise = createNoiseBuffer(ctx, 0.08);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
      src.connect(hp);
      hp.connect(gain);
      gain.connect(output);
      src.start(startTime);
      src.stop(startTime + 0.08);
    }

    return output;
  }
}
