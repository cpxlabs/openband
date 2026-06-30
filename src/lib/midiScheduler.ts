import { Platform } from "react-native";
import type { MIDINote } from "./types";

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export interface SchedulerNote {
  pitch: number;
  velocity: number;
  startBeat: number;
  durationBeats: number;
}

export interface SchedulerState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  lookAheadBeats: number;
  scheduleIntervalMs: number;
}

interface ScheduledOscillator {
  osc: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  noteId: string;
  endTimeout: ReturnType<typeof setTimeout>;
}

let audioCtx: AudioContext | null = null;
const activeOscillators: Map<string, ScheduledOscillator> = new Map();

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function midiToMidiId(note: SchedulerNote): string {
  return `${note.pitch}-${note.startBeat.toFixed(3)}`;
}

function noteOn(
  pitch: number,
  velocity: number,
  when: number,
  durationSec: number,
  waveform: OscillatorType = "sawtooth",
): string {
  const ctx = getAudioContext();
  if (!ctx) return "";
  const freq = NOTE_FREQS[pitch] || 440;
  const vol = Math.max(0.01, velocity / 127) * 0.25;

  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.setValueAtTime(freq, when);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(freq * 6, 18000), when);
  filter.Q.setValueAtTime(1, when);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(vol, when + 0.008);
  gain.gain.setValueAtTime(vol, when + Math.max(0, durationSec - 0.03));
  gain.gain.linearRampToValueAtTime(0.001, when + durationSec);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(when);
  osc.stop(when + durationSec + 0.05);

  const id = `midi-${pitch}-${when.toFixed(3)}-${Math.random().toString(36).slice(2, 6)}`;

  const endTimeout = setTimeout(() => {
    activeOscillators.delete(id);
  }, (durationSec + 0.1) * 1000);

  activeOscillators.set(id, { osc, gain, filter, noteId: id, endTimeout });
  return id;
}

function noteOff(id: string): void {
  const voice = activeOscillators.get(id);
  if (!voice) return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      voice.gain.gain.cancelScheduledValues(ctx.currentTime);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, ctx.currentTime);
      voice.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      setTimeout(() => {
        try { voice.osc.stop(); } catch {}
        activeOscillators.delete(id);
      }, 40);
    } else {
      voice.osc.stop();
      activeOscillators.delete(id);
    }
  } catch {
    activeOscillators.delete(id);
  }
  clearTimeout(voice.endTimeout);
}

function stopAll(): void {
  for (const [id] of activeOscillators) {
    noteOff(id);
  }
}

export interface LookaheadScheduler {
  start: (
    notes: MIDINote[],
    bpm: number,
    startBeat?: number,
    waveform?: OscillatorType,
  ) => void;
  stop: () => void;
  seekTo: (beat: number) => void;
  isRunning: () => boolean;
  getCurrentBeat: () => number;
  dispose: () => void;
}

export function createLookaheadScheduler(): LookaheadScheduler {
  let notes: SchedulerNote[] = [];
  let currentBeat = 0;
  let isPlaying = false;
  let bpm = 120;
  let waveform: OscillatorType = "sawtooth";
  let startBeat = 0;
  let scheduledUpTo = 0;
  let perfStart = 0;

  const SCHEDULE_AHEAD = 0.15;
  const CHECK_INTERVAL = 25;
  let checkTimer: ReturnType<typeof setInterval> | null = null;

  function getBeatDuration(): number {
    return 60 / Math.max(1, bpm);
  }

  function scheduleNotesInWindow(fromBeat: number, toBeat: number): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    for (const note of notes) {
      const noteStart = note.startBeat;
      const noteEnd = note.startBeat + note.durationBeats;

      if (noteEnd < fromBeat || noteStart > toBeat) continue;

      const beatDur = getBeatDuration();
      const when = now + (noteStart - currentBeat) * beatDur;
      const durationSec = note.durationBeats * beatDur;

      if (when < now - 0.01) continue;

      const existingId = midiToMidiId(note);
      const alreadyScheduled = activeOscillators.has(existingId);
      if (!alreadyScheduled && when >= now - 0.01) {
        noteOn(note.pitch, note.velocity, when, durationSec, waveform);
      }
    }
  }

  function tick(): void {
    if (!isPlaying) return;

    const elapsed = (performance.now() - perfStart) / 1000;
    currentBeat = startBeat + elapsed * (bpm / 60);

    const lookAheadBeat = currentBeat + SCHEDULE_AHEAD;
    scheduleNotesInWindow(scheduledUpTo, lookAheadBeat);
    scheduledUpTo = lookAheadBeat;
  }

  return {
    start: (
      midiNotes: MIDINote[],
      newBpm: number,
      newStartBeat: number = 0,
      newWaveform: OscillatorType = "sawtooth",
    ) => {
      stopAll();
      notes = midiNotes.map((n) => ({
        pitch: n.pitch,
        velocity: n.velocity,
        startBeat: n.start,
        durationBeats: n.duration,
      }));
      bpm = newBpm;
      startBeat = newStartBeat;
      waveform = newWaveform;
      currentBeat = newStartBeat;
      scheduledUpTo = newStartBeat;
      perfStart = performance.now();
      isPlaying = true;

      scheduleNotesInWindow(currentBeat, currentBeat + SCHEDULE_AHEAD);
      scheduledUpTo = currentBeat + SCHEDULE_AHEAD;

      if (checkTimer) clearInterval(checkTimer);
      checkTimer = setInterval(tick, CHECK_INTERVAL);
    },
    stop: () => {
      isPlaying = false;
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
      stopAll();
    },
    seekTo: (beat: number) => {
      startBeat = beat;
      currentBeat = beat;
      scheduledUpTo = beat;
      perfStart = performance.now();
      stopAll();
    },
    isRunning: () => isPlaying,
    getCurrentBeat: () => currentBeat,
    dispose: () => {
      isPlaying = false;
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
      stopAll();
    },
  };
}

export function disposeMidiScheduler(): void {
  stopAll();
}

export function noteNumberToName(note: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(note / 12) - 1;
  const name = names[note % 12];
  return `${name}${octave}`;
}

export function frequencyToNote(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}
