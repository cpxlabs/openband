import type { MIDINote } from "./types";

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++)
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);

export async function freezeTrackBuffer(
  notes: MIDINote[],
  bpm: number,
  volume: number = 0.8,
  pan: number = 0,
  waveform: OscillatorType = "sawtooth",
  fx?: { filterCutoff?: number; reverbMix?: number },
  sampleRate: number = 44100,
): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === "undefined") return null;
  const safeBpm = Math.max(1, bpm);
  const beatDuration = 60 / safeBpm;

  let totalBeats = 0;
  for (const note of notes) {
    const end = note.start + note.duration;
    if (end > totalBeats) totalBeats = end;
  }
  if (totalBeats === 0) return null;

  const duration = totalBeats * beatDuration + 2;
  const ctx = new OfflineAudioContext(
    2,
    Math.ceil(sampleRate * duration),
    sampleRate,
  );

  const trackGain = ctx.createGain();
  trackGain.gain.value = volume;

  const panNode = ctx.createStereoPanner();
  panNode.pan.value = pan;

  let lastNode: AudioNode = trackGain;

  if (fx?.filterCutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = fx.filterCutoff;
    trackGain.connect(filter);
    lastNode = filter;
  }

  if (fx?.reverbMix && fx.reverbMix > 0) {
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - fx.reverbMix;
    const wetGain = ctx.createGain();
    wetGain.gain.value = fx.reverbMix;

    const convolver = ctx.createConvolver();
    const irBuffer = createConvolutionBuffer(ctx, 3);
    convolver.buffer = irBuffer;

    lastNode.connect(dryGain);
    lastNode.connect(convolver);
    convolver.connect(wetGain);

    const merger = ctx.createGain();
    dryGain.connect(merger);
    wetGain.connect(merger);
    lastNode = merger;
  }

  panNode.connect(lastNode);

  for (const note of notes) {
    const freq = NOTE_FREQS[note.pitch] || 440;
    const noteStart = note.start * beatDuration;
    const noteDur = note.duration * beatDuration;
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

  return await ctx.startRendering();
}

export function audioBufferToMp3(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const nc = audioBuffer.numberOfChannels;
    const sr = audioBuffer.sampleRate;
    const ns = audioBuffer.length;
    const ab = new ArrayBuffer(44 + ns * nc * 2);
    const v = new DataView(ab);
    const w = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++)
        v.setUint8(o + i, s.charCodeAt(i));
    };
    w(0, "RIFF");
    v.setUint32(4, 36 + ns * nc * 2, true);
    w(8, "WAVE");
    w(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, nc, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * nc * 2, true);
    v.setUint16(32, nc * 2, true);
    v.setUint16(34, 16, true);
    w(36, "data");
    v.setUint32(40, ns * nc * 2, true);
    for (let i = 0; i < ns; i++) {
      for (let ch = 0; ch < nc; ch++) {
        v.setInt16(
          44 + (i * nc + ch) * 2,
          Math.max(
            -32768,
            Math.min(
              32767,
              Math.round(audioBuffer.getChannelData(ch)[i] * 32767),
            ),
          ),
          true,
        );
      }
    }
    resolve(ab);
  });
}

function createConvolutionBuffer(
  ctx: OfflineAudioContext,
  duration: number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.ceil(sr * duration);
  const buffer = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.5));
    }
  }
  return buffer;
}
