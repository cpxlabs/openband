import { Platform } from "react-native";
import type { MIDINote, TrackDef, BusDef } from "./types";
import type { Mood } from "./projectTemplates";
import { MOODS } from "./projectTemplates";
import { audioBufferToWavBlob } from "./audio";
import { getSharedAudioContext, createTrackedBlob } from "./universalAudio";
import { applyPluginChain } from "./pluginChain";
import { applyAutomationToParam, buildAutomationSchedule } from "./automationEngine";
import { crossfadeGain } from "./regionEdit";
import { timeStretch } from "./timeStretch";
import Soundfont from "soundfont-player";

async function maybeTimeStretchRegion(
  buffer: AudioBuffer,
  targetDuration: number,
): Promise<AudioBuffer> {
  if (!targetDuration || targetDuration <= 0) return buffer;
  const src = buffer.duration;
  if (src <= 0) return buffer;
  const rate = src / targetDuration;
  if (!isFinite(rate) || Math.abs(rate - 1) < 0.02) return buffer;
  try {
    const stretched = await timeStretch(buffer, rate);
    return stretched && stretched.length > 0 ? stretched : buffer;
  } catch {
    return buffer;
  }
}

const sfCache: Record<string, Soundfont.Instrument> = {};

export function getTrackSfName(trackName: string): string {
  const l = trackName.toLowerCase();
  if (l.includes('bateria') || l.includes('drums') || l.includes('kick')) return 'synth_drum';
  if (l.includes('percussão') || l.includes('percussion')) return 'melodic_tom';
  if (l.includes('baixo') || l.includes('bass')) return 'electric_bass_finger';
  if (l.includes('808')) return 'synth_bass_1';
  if (l.includes('guitarra') || l.includes('violão') || l.includes('guitar')) return 'electric_guitar_clean';
  if (l.includes('piano') || l.includes('keys')) return 'acoustic_grand_piano';
  if (l.includes('sax')) return 'alto_sax';
  if (l.includes('organ')) return 'rock_organ';
  if (l.includes('synth') || l.includes('lead')) return 'lead_1_square';
  if (l.includes('pad')) return 'pad_1_new_age';
  return 'acoustic_grand_piano';
}

export async function preloadSoundfont(trackName: string) {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  const sfName = getTrackSfName(trackName);
  if (sfCache[sfName]) return;
  try {
    sfCache[sfName] = await Soundfont.instrument(ctx as any, sfName as any);
  } catch (e) {
    console.warn("Failed to load soundfont", sfName, e);
  }
}

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  return getSharedAudioContext();
}

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export type WaveformType = "sine" | "square" | "sawtooth" | "triangle";

// --- Native MIDI Synthesis (pure JS, no OfflineAudioContext) ---

function generateWaveform(type: WaveformType, frequency: number, duration: number, sampleRate: number, volume: number): Float32Array {
  const numSamples = Math.ceil(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  const phaseIncrement = frequency / sampleRate;
  let phase = 0;

  for (let i = 0; i < numSamples; i++) {
    let value = 0;
    switch (type) {
      case "sine":
        value = Math.sin(2 * Math.PI * phase);
        break;
      case "square":
        value = phase < 0.5 ? 1 : -1;
        break;
      case "sawtooth":
        value = 2 * phase - 1;
        break;
      case "triangle":
        value = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
        break;
    }
    samples[i] = value * volume;
    phase += phaseIncrement;
    if (phase >= 1) phase -= 1;
  }
  return samples;
}

function generateNoiseBuffer(duration: number, sampleRate: number): Float32Array {
  const numSamples = Math.ceil(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = Math.random() * 2 - 1;
  }
  return samples;
}

function applyEnvelope(samples: Float32Array, attack: number, decay: number, sustainLevel: number, release: number, sampleRate: number): Float32Array {
  const result = new Float32Array(samples.length);
  const attackSamples = attack * sampleRate;
  const decaySamples = decay * sampleRate;
  const releaseStart = samples.length - release * sampleRate;

  for (let i = 0; i < samples.length; i++) {
    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i < attackSamples + decaySamples) {
      envelope = 1 - (1 - sustainLevel) * ((i - attackSamples) / decaySamples);
    } else if (i > releaseStart) {
      envelope = sustainLevel * (1 - (i - releaseStart) / (samples.length - releaseStart));
    }
    result[i] = samples[i] * envelope;
  }
  return result;
}

function applySimpleLowPass(samples: Float32Array, cutoffFreq: number, sampleRate: number): Float32Array {
  const result = new Float32Array(samples.length);
  const rc = 1 / (2 * Math.PI * cutoffFreq);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  let prev = 0;

  for (let i = 0; i < samples.length; i++) {
    prev = prev + alpha * (samples[i] - prev);
    result[i] = prev;
  }
  return result;
}

function applySimpleHighPass(samples: Float32Array, cutoffFreq: number, sampleRate: number): Float32Array {
  const result = new Float32Array(samples.length);
  const rc = 1 / (2 * Math.PI * cutoffFreq);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);
  let prevInput = 0;
  let prevOutput = 0;

  for (let i = 0; i < samples.length; i++) {
    prevOutput = alpha * (prevOutput + samples[i] - prevInput);
    prevInput = samples[i];
    result[i] = prevOutput;
  }
  return result;
}

function generateDrumSamples(pitch: number, velocity: number, duration: number, sampleRate: number): { left: Float32Array; right: Float32Array } {
  const numSamples = Math.ceil(sampleRate * duration);
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);
  const vol = (velocity / 127) * 0.5;

  if (pitch === 36 || pitch === 35) {
    // Kick drum: sine with pitch sweep
    const freq = 150;
    const pitchSweep = 0.05;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const currentFreq = freq * Math.exp(-t / pitchSweep * 3);
      const env = Math.exp(-t / 0.3);
      const sample = Math.sin(2 * Math.PI * currentFreq * t) * vol * env;
      left[i] = sample;
      right[i] = sample;
    }
  } else if (pitch === 38 || pitch === 40) {
    // Snare: noise + triangle oscillator
    const noiseDuration = 0.15;
    const noiseSamples = Math.min(Math.ceil(sampleRate * noiseDuration), numSamples);
    const noise = generateNoiseBuffer(noiseDuration, sampleRate);
    // Bandpass noise
    const filteredNoise = applySimpleLowPass(noise, 2000, sampleRate);
    const filteredHP = applySimpleHighPass(filteredNoise, 500, sampleRate);
    for (let i = 0; i < noiseSamples; i++) {
      const env = Math.exp(-i / (sampleRate * 0.15)) * vol * 0.7;
      left[i] += filteredHP[i] * env;
      right[i] += filteredHP[i] * env;
    }
    // Triangle oscillator layer
    const triFreq = 200;
    for (let i = 0; i < Math.min(numSamples, Math.ceil(sampleRate * 0.08)); i++) {
      const env = Math.exp(-i / (sampleRate * 0.08)) * vol * 0.3;
      const sample = Math.sin(2 * Math.PI * triFreq * (i / sampleRate)) * env;
      left[i] += sample;
      right[i] += sample;
    }
  } else if (pitch === 42 || pitch === 44 || pitch === 46) {
    // Hi-hat: filtered noise, short
    const hhDuration = pitch === 46 ? 0.2 : 0.08;
    const noise = generateNoiseBuffer(hhDuration, sampleRate);
    const filtered = applySimpleHighPass(noise, 6000, sampleRate);
    const hhSamples = Math.min(Math.ceil(sampleRate * hhDuration), numSamples);
    for (let i = 0; i < hhSamples; i++) {
      const env = Math.exp(-i / (sampleRate * hhDuration)) * vol * 0.4;
      left[i] = filtered[i] * env;
      right[i] = filtered[i] * env;
    }
  } else if (pitch === 43 || pitch === 47 || pitch === 57) {
    // Tom: similar to kick but higher pitch
    const baseFreq = pitch === 43 ? 100 : pitch === 47 ? 80 : 60;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const currentFreq = baseFreq * Math.exp(-t / 0.08 * 2);
      const env = Math.exp(-t / 0.4);
      const sample = Math.sin(2 * Math.PI * currentFreq * t) * vol * env;
      left[i] = sample;
      right[i] = sample;
    }
  } else if (pitch === 49 || pitch === 51 || pitch === 55 || pitch === 59) {
    // Cymbal: long filtered noise
    const noise = generateNoiseBuffer(duration, sampleRate);
    const filtered = applySimpleHighPass(noise, 8000, sampleRate);
    for (let i = 0; i < numSamples; i++) {
      const env = Math.exp(-i / (sampleRate * duration * 0.5)) * vol * 0.3;
      left[i] = filtered[i] * env;
      right[i] = filtered[i] * env;
    }
  }

  return { left, right };
}

function renderMidiNotesNative(
  tracks: { name: string; volume: number; pan: number; muted: boolean; solo: boolean; midiNotes?: MIDINote[]; outputId?: string }[],
  buses: { id: string; muted: boolean; volume: number }[] | undefined,
  duration: number,
  sampleRate: number,
  mood: Mood | undefined,
): Float32Array {
  const totalSamples = Math.ceil(sampleRate * duration);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const anySolo = tracks.some((t) => t.solo);
  const audible = tracks.filter((t) => (anySolo ? t.solo && !t.muted : !t.muted));

  // Build bus gain map
  const busGains: Record<string, number> = {};
  if (buses) {
    for (const bus of buses) {
      busGains[bus.id] = bus.muted ? 0 : bus.volume / 100;
    }
  }

  const moodPreset = mood ? MOODS.find((m) => m.id === mood) : undefined;
  const beatDuration = 60 / 120;

  for (const track of audible) {
    if (!track.midiNotes || track.midiNotes.length === 0) continue;

    const trackGain = track.volume / 100;
    const pan = track.pan / 100;
    const leftGain = trackGain * (pan < 0 ? 1 : 1 - pan);
    const rightGain = trackGain * (pan > 0 ? 1 : 1 + pan);
    const busGain = track.outputId && busGains[track.outputId] !== undefined ? busGains[track.outputId] : 1;
    const effectiveLeftGain = leftGain * busGain;
    const effectiveRightGain = rightGain * busGain;

    const isDrumTrack =
      track.name.toLowerCase().includes("bateria") ||
      track.name.toLowerCase().includes("drums") ||
      track.name.toLowerCase().includes("percussão") ||
      track.name.toLowerCase().includes("percussion");

    const waveform = getTrackWaveform(track.name);

    for (const note of track.midiNotes) {
      const noteStartSec = note.start * beatDuration;
      const noteDurSec = note.duration * beatDuration;
      const startSample = Math.floor(noteStartSec * sampleRate);

      if (startSample >= totalSamples) continue;

      let noteSamples: { left: Float32Array; right: Float32Array };

      if (isDrumTrack) {
        noteSamples = generateDrumSamples(note.pitch, note.velocity, noteDurSec + 0.1, sampleRate);
      } else {
        const freq = NOTE_FREQS[note.pitch] || 440;
        const vol = Math.max(0.01, note.velocity / 127) * 0.3;
        const oscSamples = generateWaveform(waveform, freq, noteDurSec + 0.05, sampleRate, vol);
        // Apply simple ADSR envelope
        const envelopeSamples = applyEnvelope(oscSamples, 0.005, noteDurSec * 0.3, 0.8, 0.02, sampleRate);
        noteSamples = { left: envelopeSamples, right: envelopeSamples };
      }

      // Mix into stereo buffer
      const mixLen = Math.min(noteSamples.left.length, totalSamples - startSample);
      for (let i = 0; i < mixLen; i++) {
        if (startSample + i >= 0 && startSample + i < totalSamples) {
          left[startSample + i] += noteSamples.left[i] * effectiveLeftGain;
          right[startSample + i] += noteSamples.right[i] * effectiveRightGain;
        }
      }
    }
  }

  // Apply mood effects (simple filter + reverb approximation)
  if (moodPreset) {
    // Apply filter if present
    if (moodPreset.filter) {
      if (moodPreset.filter.type === "lowpass") {
        for (let ch = 0; ch < 2; ch++) {
          const buf = ch === 0 ? left : right;
          const filtered = applySimpleLowPass(buf, moodPreset.filter.freq, sampleRate);
          (ch === 0 ? left : right).set(filtered);
        }
      } else if (moodPreset.filter.type === "highpass") {
        for (let ch = 0; ch < 2; ch++) {
          const buf = ch === 0 ? left : right;
          const filtered = applySimpleHighPass(buf, moodPreset.filter.freq, sampleRate);
          (ch === 0 ? left : right).set(filtered);
        }
      }
    }

    // Simple reverb approximation (add delayed, attenuated copies)
    if (moodPreset.reverb) {
      const mix = moodPreset.reverb.mix * 0.5;
      const decay = Math.min(moodPreset.reverb.decay, 2);
      const delaySamples = Math.floor(sampleRate * 0.03); // 30ms delay
      for (let ch = 0; ch < 2; ch++) {
        const buf = ch === 0 ? left : right;
        const wet = new Float32Array(buf.length);
        for (let tap = 1; tap <= 4; tap++) {
          const delay = delaySamples * tap;
          const gain = mix * Math.exp(-tap / decay);
          for (let i = delay; i < buf.length; i++) {
            wet[i] += buf[i - delay] * gain;
          }
        }
        for (let i = 0; i < buf.length; i++) {
          buf[i] = buf[i] * (1 - mix * 0.3) + wet[i];
        }
      }
    }
  }

  // Interleave stereo samples for WAV encoding
  const interleaved = new Float32Array(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    interleaved[i * 2] = Math.max(-1, Math.min(1, left[i]));
    interleaved[i * 2 + 1] = Math.max(-1, Math.min(1, right[i]));
  }

  return interleaved;
}

function interleaveToWavBlob(interleaved: Float32Array, sampleRate: number): Blob {
  const numSamples = interleaved.length / 2;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const ab = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(ab);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Write samples
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = interleaved[i * numChannels + ch];
      const clamped = Math.max(-1, Math.min(1, sample));
      const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(headerSize + (i * numChannels + ch) * bytesPerSample, val, true);
    }
  }

  return new Blob([ab], { type: "audio/wav" });
}

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
  trackName?: string
): string {
  const ctx = getAudioContext();
  if (!ctx) return "";
  
  const id = `${note}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  if (trackName) {
    const sfName = getTrackSfName(trackName);
    const sfInst = sfCache[sfName];
    if (sfInst) {
      const node = sfInst.play(note, ctx.currentTime, { gain: velocity / 127 });
      activeVoices.set(id, { sfNode: node } as any);
      return id;
    } else {
      preloadSoundfont(trackName); // Load it for next time
    }
  }

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
    if ((voice as any).sfNode) {
      ((voice as any).sfNode as any).stop(getAudioContext()?.currentTime || 0);
      activeVoices.delete(id);
      return;
    }
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
  trackName?: string
): string[] {
  const ids: string[] = [];
  const ctx = getAudioContext();
  if (!ctx) return ids;
  const now = ctx.currentTime;
  const safeBpm = Math.max(1, bpm);
  const beatDuration = 60 / safeBpm;

  let sfInst: Soundfont.Instrument | undefined;
  if (trackName) {
    const sfName = getTrackSfName(trackName);
    sfInst = sfCache[sfName];
    if (!sfInst) {
      preloadSoundfont(trackName); // load it for next playback
    }
  }

  if (sfInst) {
    const events = notes
      .filter(n => n.start >= startBeat)
      .map(note => ({
        time: now + (note.start - startBeat) * beatDuration,
        note: note.pitch,
        duration: note.duration * beatDuration,
        gain: note.velocity / 127
      }));
    // sfInst.schedule doesn't return a cancellable node easily in this API, 
    // but we can just use play for individual events so we can stop them.
    for (const event of events) {
      if (event.time < now) continue;
      const node = sfInst.play(event.note, event.time, { duration: event.duration, gain: event.gain as any });
      const id = `midi-${event.note}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      ids.push(id);
      activeVoices.set(id, { sfNode: node } as any);
      // Clean up after duration
      setTimeout(() => {
        activeVoices.delete(id);
      }, (event.time - now + event.duration + 0.1) * 1000);
    }
    return ids;
  }

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
    activeVoices.set(id, {
      oscillator,
      gainNode,
      filterNode,
      startTime: ctx.currentTime,
      note: note.pitch,
    });

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

export function getProjectDurationSeconds(
  tracks: TrackDef[],
  bpm: number,
): number {
  const safeBpm = Math.max(1, bpm);
  const beatDuration = 60 / safeBpm;

  let totalBeats = 0;
  let regionMaxEnd = 0;
  for (const track of tracks) {
    if (track.midiNotes) {
      for (const note of track.midiNotes) {
        const end = note.start + note.duration;
        if (end > totalBeats) totalBeats = end;
      }
    }
    for (const region of track.regions || []) {
      const end = region.start + region.duration;
      if (end > regionMaxEnd) regionMaxEnd = end;
    }
  }
  const hasRegions = tracks.some((t) => (t.regions || []).some((r) => r.url));
  if (totalBeats === 0 && !hasRegions) return 0;
  return Math.max(totalBeats * beatDuration, regionMaxEnd) + 2;
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
  let regionMaxEnd = 0;
  for (const track of tracks) {
    if (track.midiNotes) {
      for (const note of track.midiNotes) {
        const end = note.start + note.duration;
        if (end > totalBeats) totalBeats = end;
      }
    }
    for (const region of track.regions || []) {
      const end = region.start + region.duration;
      if (end > regionMaxEnd) regionMaxEnd = end;
    }
  }
  const hasRegions = tracks.some((t) => (t.regions || []).some((r) => r.url));
  if (totalBeats === 0 && !hasRegions) return null;
  const duration = Math.max(totalBeats * beatDuration, regionMaxEnd) + 2;
  const sampleRate = 44100;
  const numSamples = Math.ceil(sampleRate * duration);
  const anySolo = tracks.some((t) => t.solo);

  const moodPreset = mood ? MOODS.find((m) => m.id === mood) : undefined;

  for (const track of tracks) {
    if (track.midiNotes && track.midiNotes.length > 0) {
      await preloadSoundfont(track.name);
    }
  }

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

      const decodedRegions = new Map<string, { buffer: AudioBuffer; start: number; duration: number }[]>();
      for (const track of tracks) {
        if (track.muted || (anySolo && !track.solo)) continue;
        const trackRegionsRaw = track.regions || [];
        const decoded: { buffer: AudioBuffer; start: number; duration: number }[] = [];
        for (const region of trackRegionsRaw) {
          if (!region.url) continue;
          try {
            const r = await fetch(region.url, { credentials: "omit" });
            const ab = await r.arrayBuffer();
            const decodeCtx = getSharedAudioContext() || ctx;
            const buffer = await decodeCtx.decodeAudioData(ab);
            decoded.push({ buffer, start: region.start, duration: region.duration });
          } catch (e) {
            console.warn("Failed to decode region for track", track.name, e);
          }
        }
        if (decoded.length) decodedRegions.set(track.id, decoded);
      }

      for (const track of tracks) {
        if (track.muted || (anySolo && !track.solo)) continue;

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
        const sfName = getTrackSfName(track.name);
        const sfInst = sfCache[sfName];

        if (track.plugins && track.plugins.length > 0) {
          try {
            const trackBuf = await renderTrackBuffer(
              track,
              beatDuration,
              duration,
              sampleRate,
              numSamples,
              decodedRegions.get(track.id) || [],
            );
            const procBuf = await applyPluginChain(
              trackBuf,
              track.plugins,
              sampleRate,
              { duration },
            );
            const out = ctx.createBufferSource();
            out.buffer = procBuf;
            out.connect(panNode);
          } catch (e) {
            console.warn("Plugin chain render failed for track", track.name, e);
          }
        } else {
        if (track.midiNotes) for (const note of track.midiNotes) {
          const noteStart = note.start * beatDuration;
          const noteDur = note.duration * beatDuration;
          const vol = Math.max(0.01, note.velocity / 127) * 0.5;

          if (sfInst && sfInst.buffers && sfInst.buffers[note.pitch]) {
            const buffer = sfInst.buffers[note.pitch];
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            const noteGain = ctx.createGain();
            noteGain.gain.setValueAtTime(vol, noteStart);
            // simple release envelope
            noteGain.gain.setValueAtTime(vol, noteStart + noteDur);
            noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur + 0.1);
            
            source.connect(noteGain);
            noteGain.connect(panNode);
            
            source.start(noteStart);
            source.stop(noteStart + noteDur + 0.1);
          } else if (isDrumTrack) {
            const drumNode = createDrumSound(ctx, note.pitch, noteStart, note.velocity)
            drumNode.connect(panNode)
          } else {
            const freq = NOTE_FREQS[note.pitch] || 440;

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

        const trackRegions = decodedRegions.get(track.id);
        if (trackRegions) {
          for (const r of trackRegions) {
            const source = ctx.createBufferSource();
            source.buffer = r.buffer;
            source.connect(panNode);
            source.start(r.start, 0, Math.min(r.duration, Math.max(0, duration - r.start)));
          }
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
      // Fall through to native path
    }
  }

  // Native path: pure JS MIDI synthesis (no OfflineAudioContext)
  try {
    const interleaved = renderMidiNotesNative(
      tracks.map((t) => ({
        name: t.name,
        volume: t.volume ?? 1,
        pan: t.pan ?? 0,
        muted: t.muted || false,
        solo: t.solo || false,
        midiNotes: t.midiNotes,
        outputId: t.outputId || undefined,
      })),
      buses,
      duration,
      sampleRate,
      mood,
    );
    const blob = interleaveToWavBlob(interleaved, sampleRate);
    return createTrackedBlob(blob);
  } catch (e) {
    console.warn("Native MIDI render failed:", e);
    return null;
  }
}

export async function renderTrackStem(
  track: TrackDef,
  bpm: number,
  duration: number,
  _buses?: BusDef[],
): Promise<AudioBuffer | null> {
  const safeBpm = Math.max(1, bpm);
  const beatDuration = 60 / safeBpm;
  if (!duration || duration <= 0) return null;

  const sampleRate = 44100;
  const numSamples = Math.ceil(sampleRate * duration);

  let totalBeats = 0;
  let regionMaxEnd = 0;
  if (track.midiNotes) {
    for (const note of track.midiNotes) {
      const end = note.start + note.duration;
      if (end > totalBeats) totalBeats = end;
    }
  }
  for (const region of track.regions || []) {
    const end = region.start + region.duration;
    if (end > regionMaxEnd) regionMaxEnd = end;
  }
  const hasRegions = (track.regions || []).some((r) => r.url);
  if (totalBeats === 0 && !hasRegions) return null;

  if (typeof OfflineAudioContext === "undefined") return null;

  try {
    const ctx = new OfflineAudioContext(2, numSamples, sampleRate);

    const trackGain = ctx.createGain();
    trackGain.gain.value = (track.volume ?? 100) / 100;
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = (track.pan ?? 0) / 100;

    const automation = track.automation ?? {};
    for (const key of Object.keys(automation)) {
      const points = (automation as Record<string, { time: number; value: number; curve: "linear" | "exponential" }[]>)[key];
      if (!points || points.length === 0) continue;
      if (key === "volume") {
        const schedule = buildAutomationSchedule(
          points.map((p) => ({ ...p, value: (p.value ?? 0) / 100 })),
          bpm,
        );
        applyAutomationToParam(trackGain.gain, schedule, 0);
      } else if (key === "pan") {
        const schedule = buildAutomationSchedule(
          points.map((p) => ({ ...p, value: (p.value ?? 0) / 100 })),
          bpm,
        );
        applyAutomationToParam(panNode.pan, schedule, 0);
      }
    }

    panNode.connect(trackGain);
    trackGain.connect(ctx.destination);

    const decodedRegions: { buffer: AudioBuffer; start: number; duration: number }[] = [];
    for (const region of track.regions || []) {
      if (!region.url) continue;
      try {
        const r = await fetch(region.url, { credentials: "omit" });
        const ab = await r.arrayBuffer();
        const decodeCtx = getSharedAudioContext() || ctx;
        const buffer = await decodeCtx.decodeAudioData(ab);
        decodedRegions.push({ buffer, start: region.start, duration: region.duration });
      } catch (e) {
        console.warn("Failed to decode region for stem", track.name, e);
      }
    }

    const isDrumTrack =
      track.name.toLowerCase().includes("bateria") ||
      track.name.toLowerCase().includes("drums") ||
      track.name.toLowerCase().includes("percussão") ||
      track.name.toLowerCase().includes("percussion");
    const waveform = getTrackWaveform(track.name);
    const sfName = getTrackSfName(track.name);
    const sfInst = sfCache[sfName];

    if (track.plugins && track.plugins.length > 0) {
      const trackBuf = await renderTrackBuffer(
        track,
        beatDuration,
        duration,
        sampleRate,
        numSamples,
        decodedRegions,
      );
      const procBuf = await applyPluginChain(trackBuf, track.plugins, sampleRate, {
        duration,
      });
      const out = ctx.createBufferSource();
      out.buffer = procBuf;
      out.connect(panNode);
    } else {
      if (track.midiNotes)
        for (const note of track.midiNotes) {
          const noteStart = note.start * beatDuration;
          const noteDur = note.duration * beatDuration;
          const vol = Math.max(0.01, note.velocity / 127) * 0.5;

          if (sfInst && sfInst.buffers && sfInst.buffers[note.pitch]) {
            const buffer = sfInst.buffers[note.pitch];
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const noteGain = ctx.createGain();
            noteGain.gain.setValueAtTime(vol, noteStart);
            noteGain.gain.setValueAtTime(vol, noteStart + noteDur);
            noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur + 0.1);
            source.connect(noteGain);
            noteGain.connect(panNode);
            source.start(noteStart);
            source.stop(noteStart + noteDur + 0.1);
          } else if (isDrumTrack) {
            const drumNode = createDrumSound(ctx, note.pitch, noteStart, note.velocity);
            drumNode.connect(panNode);
          } else {
            const freq = NOTE_FREQS[note.pitch] || 440;
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

      const ordered = decodedRegions
        .map((r, i) => ({ r, i }))
        .sort((a, b) => a.r.start - b.r.start);
      for (let oi = 0; oi < ordered.length; oi++) {
        const region = ordered[oi].r;
        try {
          const source = ctx.createBufferSource();
          source.buffer = region.buffer;
          const playDur = Math.min(region.duration, Math.max(0, duration - region.start));
          if (playDur <= 0) continue;
          const regionEnd = region.start + playDur;
          const prev = oi > 0 ? ordered[oi - 1].r : null;
          const prevEnd = prev ? prev.start + prev.duration : -Infinity;
          const overlapIn = prev ? Math.max(0, prevEnd - region.start) : 0;
          const gainNode = ctx.createGain();
          if (overlapIn > 0) {
            const fadeSec = Math.min(overlapIn, playDur, 0.05);
            const [, gIn] = crossfadeGain(0, 1);
            gainNode.gain.setValueAtTime(0.0001, region.start);
            gainNode.gain.linearRampToValueAtTime(gIn, region.start + fadeSec);
            const next = oi + 1 < ordered.length ? ordered[oi + 1].r : null;
            const overlapOut = next ? Math.max(0, regionEnd - next.start) : 0;
            if (overlapOut > 0) {
              const fadeOut = Math.min(overlapOut, playDur, 0.05);
              gainNode.gain.setValueAtTime(gIn, regionEnd - fadeOut);
              gainNode.gain.linearRampToValueAtTime(0.0001, regionEnd);
            }
          } else {
            const next = oi + 1 < ordered.length ? ordered[oi + 1].r : null;
            const overlapOut = next ? Math.max(0, regionEnd - next.start) : 0;
            gainNode.gain.setValueAtTime(1, region.start);
            if (overlapOut > 0) {
              const fadeOut = Math.min(overlapOut, playDur, 0.05);
              const [gOut] = crossfadeGain(1, 0);
              gainNode.gain.setValueAtTime(gOut, regionEnd - fadeOut);
              gainNode.gain.linearRampToValueAtTime(0.0001, regionEnd);
            }
          }
          source.buffer = await maybeTimeStretchRegion(region.buffer, playDur);
          source.connect(gainNode);
          gainNode.connect(panNode);
          source.start(region.start, 0, playDur);
        } catch (e) {
          console.warn("Failed to schedule region for stem", track.name, e);
        }
      }
    }

    const buffer = await ctx.startRendering();
    return buffer;
  } catch (e) {
    console.warn("renderTrackStem failed:", e);
    return null;
  }
}

async function renderTrackBuffer(
  track: TrackDef,
  beatDuration: number,
  duration: number,
  sampleRate: number,
  numSamples: number,
  decodedRegions: { buffer: AudioBuffer; start: number; duration: number }[],
): Promise<AudioBuffer> {
  const ctx2 = new OfflineAudioContext(2, numSamples, sampleRate);

  const isDrumTrack =
    track.name.toLowerCase().includes("bateria") ||
    track.name.toLowerCase().includes("drums") ||
    track.name.toLowerCase().includes("percussão") ||
    track.name.toLowerCase().includes("percussion");

  const waveform = getTrackWaveform(track.name);
  const sfName = getTrackSfName(track.name);
  const sfInst = sfCache[sfName];

  if (track.midiNotes)
    for (const note of track.midiNotes) {
      const noteStart = note.start * beatDuration;
      const noteDur = note.duration * beatDuration;
      const vol = Math.max(0.01, note.velocity / 127) * 0.5;

      if (sfInst && sfInst.buffers && sfInst.buffers[note.pitch]) {
        const buffer = sfInst.buffers[note.pitch];
        const source = ctx2.createBufferSource();
        source.buffer = buffer;
        const noteGain = ctx2.createGain();
        noteGain.gain.setValueAtTime(vol, noteStart);
        noteGain.gain.setValueAtTime(vol, noteStart + noteDur);
        noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur + 0.1);
        source.connect(noteGain);
        noteGain.connect(ctx2.destination);
        source.start(noteStart);
        source.stop(noteStart + noteDur + 0.1);
      } else if (isDrumTrack) {
        const drumNode = createDrumSound(ctx2, note.pitch, noteStart, note.velocity);
        drumNode.connect(ctx2.destination);
      } else {
        const freq = NOTE_FREQS[note.pitch] || 440;
        const osc = ctx2.createOscillator();
        osc.type = waveform;
        osc.frequency.setValueAtTime(freq, noteStart);
        const noteGain = ctx2.createGain();
        noteGain.gain.setValueAtTime(0, noteStart);
        noteGain.gain.linearRampToValueAtTime(vol, noteStart + 0.005);
        noteGain.gain.setValueAtTime(vol, noteStart + noteDur - 0.02);
        noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur);
        osc.connect(noteGain);
        noteGain.connect(ctx2.destination);
        osc.start(noteStart);
        osc.stop(noteStart + noteDur + 0.05);
      }
    }

  for (const region of decodedRegions) {
    try {
      const source = ctx2.createBufferSource();
      source.buffer = region.buffer;
      source.connect(ctx2.destination);
      source.start(region.start, 0, Math.min(region.duration, Math.max(0, duration - region.start)));
    } catch (e) {
      console.warn("Failed to schedule region for track buffer", track.name, e);
    }
  }

  return ctx2.startRendering();
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
