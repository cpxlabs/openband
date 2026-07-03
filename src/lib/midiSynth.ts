import { Platform } from "react-native";
import type { MIDINote, TrackDef, BusDef } from "./types";
import type { Mood } from "./projectTemplates";
import { MOODS } from "./projectTemplates";
import { audioBufferToWavBlob } from "./audio";
import { getSharedAudioContext, createTrackedBlob } from "./universalAudio";

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  return getSharedAudioContext();
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
    } catch (e) {
      console.warn("midiSynth error:", e);
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

export function getTrackWaveform(trackName: string): WaveformType {
  const l = trackName.toLowerCase()
  if (l.includes('bateria') || l.includes('drums') || l.includes('kick')) return 'sine'
  if (l.includes('percussão') || l.includes('percussion')) return 'triangle'
  if (l.includes('baixo') || l.includes('bass') || l.includes('808')) return 'sawtooth'
  if (l.includes('guitarra') || l.includes('violão') || l.includes('guitar')) return 'triangle'
  if (l.includes('piano') || l.includes('keys')) return 'triangle'
  if (l.includes('sax') || l.includes('organ')) return 'sawtooth'
  if (l.includes('synth') || l.includes('lead')) return 'sawtooth'
  if (l.includes('pad')) return 'sine'
  if (l.includes('melodia') || l.includes('sample')) return 'sine'
  return 'sawtooth'
}

export function disposeAudioContext(): void {
  stopAllNotes();
  // AudioContext lifecycle is now managed by universalAudio.dispose()
}

function createNoiseBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function createDrumSound(ctx: OfflineAudioContext, pitch: number, startTime: number, velocity: number): AudioNode {
  const vol = velocity / 127 * 0.5

  if (pitch === 36 || pitch === 35) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, startTime)
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.05)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)
    osc.connect(gain)
    osc.start(startTime)
    osc.stop(startTime + 0.3)
    return gain
  }

  if (pitch === 38 || pitch === 40) {
    const noise = createNoiseBuffer(ctx, 0.15)
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1000
    bp.Q.value = 0.5
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.7, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)
    noiseSrc.connect(bp)
    bp.connect(gain)
    noiseSrc.start(startTime)
    noiseSrc.stop(startTime + 0.15)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(200, startTime)
    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(vol * 0.3, startTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08)
    osc.connect(oscGain)
    osc.start(startTime)
    osc.stop(startTime + 0.08)

    const merger = ctx.createGain()
    gain.connect(merger)
    oscGain.connect(merger)
    return merger
  }

  if (pitch === 42 || pitch === 44 || pitch === 46) {
    const noise = createNoiseBuffer(ctx, 0.08)
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.4, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08)
    noiseSrc.connect(hp)
    hp.connect(gain)
    noiseSrc.start(startTime)
    noiseSrc.stop(startTime + 0.08)
    return gain
  }

  const noise = createNoiseBuffer(ctx, 0.1)
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noise
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol * 0.5, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1)
  noiseSrc.connect(gain)
  noiseSrc.start(startTime)
  noiseSrc.stop(startTime + 0.1)
  return gain
}

export async function renderTracksToUrl(
  tracks: TrackDef[],
  bpm: number,
  mood?: Mood,
  buses?: BusDef[],
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

  const moodPreset = mood ? MOODS.find((m) => m.id === mood) : undefined;

  if (typeof OfflineAudioContext !== "undefined") {
    try {
      const ctx = new OfflineAudioContext(2, numSamples, sampleRate);

      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;

      const busGainNodes = new Map<string, { input: GainNode; output: GainNode; muted: boolean }>();
      if (buses) {
        for (const bus of buses) {
          const input = ctx.createGain();
          input.gain.value = 1;
          const output = ctx.createGain();
          output.gain.value = bus.muted ? 0 : bus.volume;
          input.connect(output);
          output.connect(masterGain);
          busGainNodes.set(bus.id, { input, output, muted: bus.muted });
        }
      }

      for (const track of tracks) {
        if (track.muted || (anySolo && !track.solo)) continue;
        if (!track.midiNotes || track.midiNotes.length === 0) continue;

        const trackGain = ctx.createGain();
        trackGain.gain.value = track.volume ?? 1;

        const panNode = ctx.createStereoPanner();
        panNode.pan.value = track.pan ?? 0;
        panNode.connect(trackGain);

        const outputId = track.outputId || "master";
        const busRoute = busGainNodes.get(outputId);
        if (busRoute) {
          trackGain.connect(busRoute.input);
        } else {
          trackGain.connect(masterGain);
        }

        const isDrumTrack = track.name.toLowerCase().includes('bateria') ||
          track.name.toLowerCase().includes('drums') ||
          track.name.toLowerCase().includes('percussão') ||
          track.name.toLowerCase().includes('percussion')

        const waveform = getTrackWaveform(track.name)

        for (const note of track.midiNotes) {
          const noteStart = note.start * beatDuration;
          const noteDur = note.duration * beatDuration;

          if (isDrumTrack) {
            const drumNode = createDrumSound(ctx, note.pitch, noteStart, note.velocity)
            drumNode.connect(panNode)
          } else {
            const freq = NOTE_FREQS[note.pitch] || 440;
            const vol = Math.max(0.01, note.velocity / 127) * 0.3;

            const osc = ctx.createOscillator();
            osc.type = waveform;
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
      }

      if (moodPreset) {
        let fxOutput: AudioNode = masterGain;

        if (moodPreset.filter) {
          const filter = ctx.createBiquadFilter();
          filter.type = moodPreset.filter.type;
          filter.frequency.value = moodPreset.filter.freq;
          filter.Q.value = moodPreset.filter.q;
          masterGain.connect(filter);
          fxOutput = filter;
        }

        if (moodPreset.reverb) {
          const dryGain = ctx.createGain();
          dryGain.gain.value = 1.0 - moodPreset.reverb.mix * 0.7;

          const wetGain = ctx.createGain();
          wetGain.gain.value = moodPreset.reverb.mix;

          const irDuration = Math.min(moodPreset.reverb.decay, 10);
          const irLen = Math.ceil(ctx.sampleRate * irDuration);
          const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
          for (let c = 0; c < 2; c++) {
            const data = ir.getChannelData(c);
            for (let i = 0; i < irLen; i++) {
              data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.5));
            }
          }

          const convolver = ctx.createConvolver();
          convolver.buffer = ir;

          fxOutput.connect(dryGain);
          dryGain.connect(ctx.destination);

          fxOutput.connect(convolver);
          convolver.connect(wetGain);
          wetGain.connect(ctx.destination);
        } else {
          fxOutput.connect(ctx.destination);
        }
      } else {
        masterGain.connect(ctx.destination);
      }

      const buffer = await ctx.startRendering();
      const blob = audioBufferToWavBlob(buffer);
      return createTrackedBlob(blob);
    } catch (e) {
      console.warn("OfflineAudioContext renderTracksToUrl failed:", e);
      return null;
    }
  }

  return null;
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
