import { Platform } from "react-native";
import type { TrackDef, BusDef } from "./types";
import type { Mood } from "./projectTemplates";
import { MOODS } from "./projectTemplates";
import { audioBufferToWavBlob } from "./audio";

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export interface ChunkedRenderOptions {
  bpm: number;
  sampleRate?: number;
  chunkDurationSec?: number;
  mood?: Mood;
  buses?: BusDef[];
  onProgress?: (percent: number, chunkIndex: number, totalChunks: number) => void;
}

interface ChunkedRenderInternalOptions {
  bpm: number;
  sampleRate: number;
  chunkDurationSec: number;
  mood: Mood | undefined;
  buses: BusDef[];
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

function createReverbBuffer(
  ctx: OfflineAudioContext,
  decay: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * decay);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * decay * 0.3));
  }
  return buf;
}

function buildTrackGraph(
  ctx: OfflineAudioContext,
  track: TrackDef,
  notes: { pitch: number; start: number; duration: number; velocity: number }[],
  beatDuration: number,
  chunkStartBeat: number,
  chunkDurationBeats: number,
): GainNode | null {
  if (notes.length === 0) return null;

  const vol = (track.volume / 100) * 0.4;
  const panValue = (track.pan + 100) / 200;

  const gainNode = ctx.createGain();
  gainNode.gain.value = vol;

  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, (panValue - 0.5) * 2));

  gainNode.connect(panner);

  for (const note of notes) {
    const noteStartBeat = note.start;
    const noteEndBeat = noteStartBeat + note.duration;

    if (noteEndBeat < chunkStartBeat || noteStartBeat > chunkStartBeat + chunkDurationBeats) continue;

    const when =
      (noteStartBeat - chunkStartBeat) * beatDuration;
    const duration = note.duration * beatDuration;
    const freq = NOTE_FREQS[note.pitch] || 440;
    const vel = Math.max(0.01, note.velocity / 127);

    const waveform = getTrackWaveform(track.name);
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, when);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, when);
    oscGain.gain.linearRampToValueAtTime(vel, when + 0.005);
    oscGain.gain.setValueAtTime(vel, Math.max(when + 0.005, when + duration - 0.02));
    oscGain.gain.linearRampToValueAtTime(0.001, when + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(freq * 5, 15000), when);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(gainNode);

    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  return gainNode;
}

export class ChunkedRenderer {
  private options: ChunkedRenderInternalOptions;
  private onProgress?: (percent: number, chunkIndex: number, totalChunks: number) => void;
  private tracks: TrackDef[] = [];
  private cancelled = false;

  constructor(options: ChunkedRenderOptions) {
    this.options = {
      bpm: options.bpm,
      sampleRate: options.sampleRate ?? 44100,
      chunkDurationSec: options.chunkDurationSec ?? 5,
      mood: options.mood,
      buses: options.buses ?? [],
    };
    this.onProgress = options.onProgress;
  }

  setTracks(tracks: TrackDef[]): void {
    this.tracks = tracks;
  }

  cancel(): void {
    this.cancelled = true;
  }

  private calculateTotalDuration(): number {
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
    return totalBeats * beatDuration + 2;
  }

  async render(): Promise<Blob | null> {
    if (Platform.OS !== "web" || typeof OfflineAudioContext === "undefined")
      return null;

    this.cancelled = false;
    const { bpm, sampleRate, chunkDurationSec, mood } = this.options;
    const safeBpm = Math.max(1, bpm);
    const beatDuration = 60 / safeBpm;
    const moodPreset = mood ? MOODS.find((m) => m.id === mood) : undefined;

    const anySolo = this.tracks.some((t) => t.solo);
    const activeTracks = this.tracks.filter(
      (t) => !t.muted && (!anySolo || t.solo) && t.midiNotes?.length,
    );
    if (activeTracks.length === 0) return null;

    const totalDuration = this.calculateTotalDuration();
    const totalChunks = Math.ceil(totalDuration / chunkDurationSec);
    const chunks: Float32Array[] = [];

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      if (this.cancelled) return null;

      const chunkStartSec = chunkIdx * chunkDurationSec;
      const chunkDur = Math.min(chunkDurationSec, totalDuration - chunkStartSec);
      const chunkStartBeat = (chunkStartSec / beatDuration);
      const chunkDurationBeats = chunkDur / beatDuration;
      const numSamples = Math.ceil(sampleRate * chunkDur);

      try {
        const ctx = new OfflineAudioContext(2, numSamples, sampleRate);

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.85;
        let masterOut: AudioNode = masterGain;

        if (moodPreset?.filter) {
          const filter = ctx.createBiquadFilter();
          filter.type = moodPreset.filter.type;
          filter.frequency.value = moodPreset.filter.freq;
          filter.Q.value = moodPreset.filter.q;
          masterGain.connect(filter);
          masterOut = filter;
        }

        if (moodPreset?.reverb) {
          const convolver = ctx.createConvolver();
          convolver.buffer = createReverbBuffer(ctx, moodPreset.reverb.decay);
          const wetGain = ctx.createGain();
          wetGain.gain.value = moodPreset.reverb.mix;
          const dryGain = ctx.createGain();
          dryGain.gain.value = 1 - moodPreset.reverb.mix;

          masterOut.connect(dryGain);
          masterOut.connect(convolver);
          convolver.connect(wetGain);
          dryGain.connect(ctx.destination);
          wetGain.connect(ctx.destination);
        } else {
          masterOut.connect(ctx.destination);
        }

        for (const track of activeTracks) {
          const notesInChunk = (track.midiNotes ?? []).filter((n) => {
            const noteEnd = n.start + n.duration;
            return noteEnd > chunkStartBeat && n.start < chunkStartBeat + chunkDurationBeats;
          });

          const trackGraph = buildTrackGraph(
            ctx,
            track,
            notesInChunk,
            beatDuration,
            chunkStartBeat,
            chunkDurationBeats,
          );

          if (trackGraph) {
            trackGraph.connect(masterOut);
          }
        }

        const rendered = await ctx.startRendering();
        const left = rendered.getChannelData(0);
        const right = rendered.getChannelData(1);
        const interleaved = new Float32Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
          interleaved[i * 2] = left[i];
          interleaved[i * 2 + 1] = right[i];
        }
        chunks.push(interleaved);

        this.onProgress?.(
          ((chunkIdx + 1) / totalChunks) * 100,
          chunkIdx,
          totalChunks,
        );
      } catch (e) {
        console.warn(`Chunk ${chunkIdx} render failed:`, e);
        const silence = new Float32Array(numSamples);
        chunks.push(silence);
      }
    }

    if (chunks.length === 0) return null;

    const totalInterleaved = chunks.reduce((sum, c) => sum + c.length, 0);
    const numSamples = totalInterleaved / 2;

    const mergedLeft = new Float32Array(numSamples);
    const mergedRight = new Float32Array(numSamples);
    let offset = 0;
    for (const chunk of chunks) {
      const chunkSamples = chunk.length / 2;
      for (let i = 0; i < chunkSamples; i++) {
        mergedLeft[offset + i] = chunk[i * 2];
        mergedRight[offset + i] = chunk[i * 2 + 1];
      }
      offset += chunkSamples;
    }

    const buffer = new OfflineAudioContext(2, numSamples, sampleRate).createBuffer(2, numSamples, sampleRate);
    buffer.getChannelData(0).set(mergedLeft);
    buffer.getChannelData(1).set(mergedRight);

    return audioBufferToWavBlob(buffer);
  }
}

export function createChunkedRenderer(
  options: ChunkedRenderOptions,
): ChunkedRenderer {
  return new ChunkedRenderer(options);
}
