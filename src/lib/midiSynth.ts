import { Platform } from "react-native";
import type { MIDINote, TrackDef } from "./types";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch((e: unknown) => {
      console.warn("Failed to resume AudioContext:", e);
    });
  }
  return audioCtx;
}

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export type WaveformType = "sine" | "square" | "sawtooth" | "triangle";

export interface SynthVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  startTime: number;
  note: number;
}

const activeVoices: Map<string, SynthVoice> = new Map();

export function playNote(
  note: number,
  velocity: number,
  waveform: WaveformType = "sawtooth",
  filterCutoff: number = 8000,
  filterResonance: number = 0,
): string {
  const ctx = getAudioContext();
  if (!ctx) return "";
  const freq = NOTE_FREQS[note] || 440;
  const vol = Math.max(0.01, velocity / 127) * 0.3;

  const oscillator = ctx.createOscillator();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(filterCutoff, ctx.currentTime);
  filterNode.Q.setValueAtTime(filterResonance, ctx.currentTime);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(vol, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);

  oscillator.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 2);

  const id = `${note}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  activeVoices.set(id, {
    oscillator,
    gainNode,
    filterNode,
    startTime: ctx.currentTime,
    note,
  });

  oscillator.onended = () => {
    activeVoices.delete(id);
  };

  return id;
}

export function stopNote(id: string): void {
  const voice = activeVoices.get(id);
  if (voice) {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        activeVoices.delete(id);
        return;
      }
      voice.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      voice.gainNode.gain.setValueAtTime(
        voice.gainNode.gain.value,
        ctx.currentTime,
      );
      voice.gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.05,
      );
      setTimeout(() => {
        try {
          voice.oscillator.stop();
        } catch (e) {
          console.warn("Failed to stop oscillator:", e);
        }
        activeVoices.delete(id);
      }, 60);
    } catch {
      activeVoices.delete(id);
    }
  }
}

export function stopAllNotes(): void {
  activeVoices.forEach((_, id) => stopNote(id));
}

export function playMidiNotes(
  notes: MIDINote[],
  bpm: number,
  startBeat: number = 0,
  waveform: WaveformType = "sawtooth",
): string[] {
  const ids: string[] = [];
  const ctx = getAudioContext();
  if (!ctx) return ids;
  const now = ctx.currentTime;
  const safeBpm = Math.max(1, bpm);
  const beatDuration = 60 / safeBpm;

  for (const note of notes) {
    const startTime = now + (note.start - startBeat) * beatDuration;
    const duration = note.duration * beatDuration;
    const freq = NOTE_FREQS[note.pitch] || 440;
    const vol = Math.max(0.01, note.velocity / 127) * 0.3;

    if (startTime < now) continue;

    const oscillator = ctx.createOscillator();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(freq, startTime);

    const filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.setValueAtTime(8000, startTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.005);
    gainNode.gain.setValueAtTime(vol, startTime + duration - 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);

    const id = `midi-${note.pitch}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    ids.push(id);

    oscillator.onended = () => {
      activeVoices.delete(id);
    };
  }

  return ids;
}

export function disposeAudioContext(): void {
  stopAllNotes();
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

export async function renderTracksToUrl(
  tracks: TrackDef[],
  bpm: number,
): Promise<string | null> {
  const safeBpm = Math.max(1, bpm);
  const beatDuration = 60 / safeBpm;

  let totalBeats = 0;
  for (const track of tracks) {
    if (track.midiNotes) {
      for (const note of track.midiNotes) {
        const end = note.start + note.duration;
        if (end > totalBeats) totalBeats = end;
      }
    }
  }
  if (totalBeats === 0) return null;
  const duration = totalBeats * beatDuration + 2;
  const sampleRate = 44100;
  const numSamples = Math.ceil(sampleRate * duration);
  const anySolo = tracks.some((t) => t.solo);

  if (typeof OfflineAudioContext !== "undefined") {
    try {
      const ctx = new OfflineAudioContext(2, numSamples, sampleRate);

      for (const track of tracks) {
        if (track.muted || (anySolo && !track.solo)) continue;
        if (!track.midiNotes || track.midiNotes.length === 0) continue;

        const trackGain = ctx.createGain();
        trackGain.gain.value = track.volume ?? 1;

        const panNode = ctx.createStereoPanner();
        panNode.pan.value = track.pan ?? 0;
        panNode.connect(trackGain);
        trackGain.connect(ctx.destination);

        for (const note of track.midiNotes) {
          const freq = NOTE_FREQS[note.pitch] || 440;
          const noteStart = note.start * beatDuration;
          const noteDur = note.duration * beatDuration;
          const vol = Math.max(0.01, note.velocity / 127) * 0.3;

          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, noteStart);

          const noteGain = ctx.createGain();
          noteGain.gain.setValueAtTime(0, noteStart);
          noteGain.gain.linearRampToValueAtTime(vol, noteStart + 0.005);
          noteGain.gain.setValueAtTime(vol, noteStart + noteDur - 0.02);
          noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur);

          osc.connect(noteGain);
          noteGain.connect(panNode);

          osc.start(noteStart);
          osc.stop(noteStart + noteDur + 0.05);
        }
      }

      const buffer = await ctx.startRendering();
      const blob = audioBufferToWavBlob(buffer);
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn("OfflineAudioContext renderTracksToUrl failed:", e);
      return null;
    }
  }

  return null;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const nc = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const ns = buffer.length;
  const bps = 2;
  const ba = nc * bps;
  const ds = ns * ba;
  const ab = new ArrayBuffer(44 + ds);
  const v = new DataView(ab);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + ds, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nc, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * ba, true);
  v.setUint16(32, ba, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, ds, true);
  for (let i = 0; i < ns; i++) {
    for (let ch = 0; ch < nc; ch++) {
      v.setInt16(
        44 + (i * nc + ch) * bps,
        Math.max(
          -32768,
          Math.min(32767, Math.round(buffer.getChannelData(ch)[i] * 32767)),
        ),
        true,
      );
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

export function midiNoteToName(pitch: number): string {
  const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}
