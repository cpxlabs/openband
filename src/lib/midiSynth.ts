import { Platform } from 'react-native';
import type { MIDINote } from './types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((e: unknown) => {
      console.warn('Failed to resume AudioContext:', e);
    });
  }
  return audioCtx;
}

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

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
  waveform: WaveformType = 'sawtooth',
  filterCutoff: number = 8000,
  filterResonance: number = 0,
): string {
  const ctx = getAudioContext();
  if (!ctx) return '';
  const freq = NOTE_FREQS[note] || 440;
  const vol = Math.max(0.01, velocity / 127) * 0.3;

  const oscillator = ctx.createOscillator();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

  const filterNode = ctx.createBiquadFilter();
  filterNode.type = 'lowpass';
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
  activeVoices.set(id, { oscillator, gainNode, filterNode, startTime: ctx.currentTime, note });

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
      if (!ctx) { activeVoices.delete(id); return; }
      voice.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, ctx.currentTime);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      setTimeout(() => {
        try { voice.oscillator.stop(); } catch (e) {
          console.warn('Failed to stop oscillator:', e);
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
  waveform: WaveformType = 'sawtooth',
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
    filterNode.type = 'lowpass';
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

export function midiNoteToName(pitch: number): string {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}
