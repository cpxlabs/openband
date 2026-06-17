import { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';

type WaveformType = 'sawtooth' | 'square' | 'triangle' | 'sine' | 'noise';
type FilterType = 'lowpass' | 'highpass' | 'bandpass';
type LfoTarget = 'pitch' | 'filter' | 'amp';
type ArpDirection = 'up' | 'down' | 'random';

interface OscConfig {
  waveform: WaveformType;
  detune: number;
  level: number;
}

interface FilterConfig {
  type: FilterType;
  cutoff: number;
  resonance: number;
  envAmount: number;
}

interface ADSRConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface LFOConfig {
  rate: number;
  depth: number;
  target: LfoTarget;
}

interface ArpConfig {
  enabled: boolean;
  direction: ArpDirection;
  rate: '1/4' | '1/8' | '1/16';
  octaves: number;
}

interface SynthPreset {
  name: string;
  osc1: OscConfig;
  osc2: OscConfig;
  filter: FilterConfig;
  adsr: ADSRConfig;
  lfo: LFOConfig;
  arp: ArpConfig;
}

const WAVEFORMS: WaveformType[] = ['sawtooth', 'square', 'triangle', 'sine', 'noise'];

const PRESETS: SynthPreset[] = [
  { name: 'Classic Bass', osc1: { waveform: 'sawtooth', detune: 0, level: 80 }, osc2: { waveform: 'square', detune: -12, level: 30 }, filter: { type: 'lowpass', cutoff: 400, resonance: 30, envAmount: 60 }, adsr: { attack: 10, decay: 200, sustain: 60, release: 300 }, lfo: { rate: 3, depth: 5, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Deep Sub', osc1: { waveform: 'sine', detune: 0, level: 90 }, osc2: { waveform: 'sine', detune: -24, level: 40 }, filter: { type: 'lowpass', cutoff: 200, resonance: 10, envAmount: 30 }, adsr: { attack: 20, decay: 300, sustain: 50, release: 500 }, lfo: { rate: 2, depth: 3, target: 'amp' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Lead Saw', osc1: { waveform: 'sawtooth', detune: 0, level: 75 }, osc2: { waveform: 'sawtooth', detune: 7, level: 60 }, filter: { type: 'lowpass', cutoff: 2000, resonance: 20, envAmount: 70 }, adsr: { attack: 5, decay: 100, sustain: 80, release: 200 }, lfo: { rate: 4, depth: 10, target: 'pitch' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Square Lead', osc1: { waveform: 'square', detune: 0, level: 70 }, osc2: { waveform: 'square', detune: 12, level: 50 }, filter: { type: 'lowpass', cutoff: 1500, resonance: 40, envAmount: 50 }, adsr: { attack: 3, decay: 80, sustain: 70, release: 150 }, lfo: { rate: 5, depth: 15, target: 'filter' }, arp: { enabled: true, direction: 'up', rate: '1/16', octaves: 2 } },
  { name: 'Analog Pad', osc1: { waveform: 'sawtooth', detune: 0, level: 60 }, osc2: { waveform: 'triangle', detune: -5, level: 50 }, filter: { type: 'lowpass', cutoff: 800, resonance: 15, envAmount: 80 }, adsr: { attack: 100, decay: 500, sustain: 80, release: 1000 }, lfo: { rate: 2, depth: 20, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Soft Piano', osc1: { waveform: 'triangle', detune: 0, level: 70 }, osc2: { waveform: 'triangle', detune: 0, level: 30 }, filter: { type: 'lowpass', cutoff: 3000, resonance: 5, envAmount: 40 }, adsr: { attack: 5, decay: 300, sustain: 60, release: 800 }, lfo: { rate: 1, depth: 5, target: 'amp' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Pluck', osc1: { waveform: 'square', detune: 0, level: 80 }, osc2: { waveform: 'sawtooth', detune: 0, level: 30 }, filter: { type: 'lowpass', cutoff: 3000, resonance: 10, envAmount: 90 }, adsr: { attack: 1, decay: 50, sustain: 10, release: 80 }, lfo: { rate: 3, depth: 5, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Wobble Bass', osc1: { waveform: 'sawtooth', detune: 0, level: 80 }, osc2: { waveform: 'square', detune: -12, level: 40 }, filter: { type: 'lowpass', cutoff: 600, resonance: 60, envAmount: 50 }, adsr: { attack: 5, decay: 100, sustain: 80, release: 200 }, lfo: { rate: 6, depth: 50, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'String Ensemble', osc1: { waveform: 'sawtooth', detune: 0, level: 65 }, osc2: { waveform: 'triangle', detune: 12, level: 45 }, filter: { type: 'lowpass', cutoff: 1500, resonance: 10, envAmount: 60 }, adsr: { attack: 50, decay: 400, sustain: 70, release: 1200 }, lfo: { rate: 1.5, depth: 10, target: 'pitch' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Brass', osc1: { waveform: 'sawtooth', detune: 0, level: 70 }, osc2: { waveform: 'square', detune: 7, level: 40 }, filter: { type: 'lowpass', cutoff: 1000, resonance: 25, envAmount: 70 }, adsr: { attack: 20, decay: 200, sustain: 70, release: 400 }, lfo: { rate: 2, depth: 8, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Sine Pad', osc1: { waveform: 'sine', detune: 0, level: 70 }, osc2: { waveform: 'sine', detune: 7, level: 50 }, filter: { type: 'lowpass', cutoff: 1000, resonance: 5, envAmount: 60 }, adsr: { attack: 200, decay: 300, sustain: 80, release: 1500 }, lfo: { rate: 1, depth: 15, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Funky Clav', osc1: { waveform: 'square', detune: 0, level: 75 }, osc2: { waveform: 'sawtooth', detune: -5, level: 35 }, filter: { type: 'bandpass', cutoff: 1500, resonance: 30, envAmount: 60 }, adsr: { attack: 2, decay: 80, sustain: 40, release: 100 }, lfo: { rate: 4, depth: 10, target: 'filter' }, arp: { enabled: true, direction: 'up', rate: '1/16', octaves: 1 } },
  { name: 'Noise FX', osc1: { waveform: 'noise', detune: 0, level: 60 }, osc2: { waveform: 'noise', detune: 0, level: 30 }, filter: { type: 'bandpass', cutoff: 3000, resonance: 40, envAmount: 50 }, adsr: { attack: 1, decay: 100, sustain: 50, release: 200 }, lfo: { rate: 8, depth: 40, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Resonant Sweep', osc1: { waveform: 'sawtooth', detune: 0, level: 70 }, osc2: { waveform: 'sine', detune: 0, level: 0 }, filter: { type: 'highpass', cutoff: 100, resonance: 80, envAmount: 90 }, adsr: { attack: 50, decay: 500, sustain: 30, release: 600 }, lfo: { rate: 3, depth: 60, target: 'filter' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Dream Pad', osc1: { waveform: 'triangle', detune: 0, level: 60 }, osc2: { waveform: 'sawtooth', detune: -12, level: 40 }, filter: { type: 'lowpass', cutoff: 600, resonance: 20, envAmount: 70 }, adsr: { attack: 150, decay: 400, sustain: 75, release: 2000 }, lfo: { rate: 0.8, depth: 25, target: 'pitch' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Acid Bass', osc1: { waveform: 'sawtooth', detune: 0, level: 85 }, osc2: { waveform: 'square', detune: -24, level: 20 }, filter: { type: 'lowpass', cutoff: 300, resonance: 70, envAmount: 80 }, adsr: { attack: 5, decay: 200, sustain: 60, release: 300 }, lfo: { rate: 5, depth: 30, target: 'filter' }, arp: { enabled: true, direction: 'up', rate: '1/16', octaves: 2 } },
  { name: 'Super Saw', osc1: { waveform: 'sawtooth', detune: 0, level: 65 }, osc2: { waveform: 'sawtooth', detune: 14, level: 55 }, filter: { type: 'lowpass', cutoff: 2500, resonance: 15, envAmount: 50 }, adsr: { attack: 5, decay: 150, sustain: 70, release: 300 }, lfo: { rate: 3, depth: 8, target: 'pitch' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: 'Subtle Bell', osc1: { waveform: 'sine', detune: 0, level: 70 }, osc2: { waveform: 'triangle', detune: 19, level: 40 }, filter: { type: 'bandpass', cutoff: 3000, resonance: 5, envAmount: 30 }, adsr: { attack: 1, decay: 500, sustain: 30, release: 1500 }, lfo: { rate: 2, depth: 5, target: 'pitch' }, arp: { enabled: true, direction: 'random', rate: '1/4', octaves: 1 } },
  { name: 'Organ', osc1: { waveform: 'square', detune: 0, level: 60 }, osc2: { waveform: 'triangle', detune: 12, level: 50 }, filter: { type: 'lowpass', cutoff: 2000, resonance: 10, envAmount: 20 }, adsr: { attack: 5, decay: 50, sustain: 90, release: 50 }, lfo: { rate: 2, depth: 5, target: 'amp' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
  { name: '808 Sub', osc1: { waveform: 'sine', detune: 0, level: 95 }, osc2: { waveform: 'square', detune: -36, level: 15 }, filter: { type: 'lowpass', cutoff: 100, resonance: 0, envAmount: 40 }, adsr: { attack: 1, decay: 600, sustain: 40, release: 800 }, lfo: { rate: 1, depth: 2, target: 'amp' }, arp: { enabled: false, direction: 'up', rate: '1/8', octaves: 1 } },
];

interface SynthProps {
  visible: boolean;
  onClose: () => void;
  bpm: number;
}

export function Synth({ visible, onClose, bpm }: SynthProps) {
  const [presetIndex, setPresetIndex] = useState(0);
  const preset = useMemo(() => PRESETS[presetIndex], [presetIndex]);
  const [showPresets, setShowPresets] = useState(false);
  const [playing, setPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodes = useRef<{ stop: () => void }[]>([]);
  const arpTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const stopAll = useCallback(() => {
    arpTimeouts.current.forEach(clearTimeout);
    arpTimeouts.current = [];
    activeNodes.current.forEach(n => n.stop());
    activeNodes.current = [];
    setPlaying(false);
  }, []);

  const playNote = useCallback((note: number) => {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      const stopped: { stop: () => void }[] = [];

      const createOsc = (oscConfig: OscConfig) => {
        if (oscConfig.level === 0) return null;
        if (oscConfig.waveform === 'noise') {
          const bufferSize = ctx.sampleRate * 0.1;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const gain = ctx.createGain();
          gain.gain.value = oscConfig.level / 100 * 0.3;
          const filter = ctx.createBiquadFilter();
          filter.type = preset.filter.type;
          filter.frequency.value = preset.filter.cutoff + (preset.filter.envAmount * 20);
          filter.Q.value = preset.filter.resonance;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          source.start(now);
          return { stop: () => { try { source.stop(); } catch {} } };
        }

        const wf: string = oscConfig.waveform;
        const osc = ctx.createOscillator();
        osc.type = (wf === 'noise' ? 'sawtooth' : wf) as OscillatorType;
        osc.frequency.value = freq * Math.pow(2, oscConfig.detune / 1200);

        const gainNode = ctx.createGain();
        gainNode.gain.value = oscConfig.level / 100 * 0.3;

        const filter = ctx.createBiquadFilter();
        filter.type = preset.filter.type;
        filter.frequency.value = preset.filter.cutoff + (preset.filter.envAmount * 20);
        filter.Q.value = preset.filter.resonance;

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        const a = preset.adsr.attack / 1000;
        const d = preset.adsr.decay / 1000;
        const dur = 0.5;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + a);
        gainNode.gain.linearRampToValueAtTime(preset.adsr.sustain / 100, now + a + d);
        gainNode.gain.setValueAtTime(preset.adsr.sustain / 100, now + dur - preset.adsr.release / 1000);
        gainNode.gain.linearRampToValueAtTime(0, now + dur);

        osc.start(now);
        osc.stop(now + dur + 0.05);
        return { stop: () => { try { osc.stop(); } catch {} } };
      };

      const s1 = createOsc(preset.osc1);
      const s2 = createOsc(preset.osc2);
      if (s1) stopped.push(s1);
      if (s2) stopped.push(s2);
      activeNodes.current = stopped;
      setPlaying(true);
    } catch {}
  }, [getCtx, preset]);

  const playArp = useCallback(() => {
    if (!preset.arp.enabled) return;
    stopAll();
    const notes = [60, 64, 67, 72];
    const divisions = preset.arp.rate === '1/4' ? 1 : preset.arp.rate === '1/8' ? 2 : 4;
    const interval = (60 / bpm) / divisions;
    notes.forEach((n, i) => {
      const t = setTimeout(() => playNote(n), i * interval * 1000);
      arpTimeouts.current.push(t);
    });
  }, [preset, bpm, playNote, stopAll]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center items-center px-2">
        <View className="w-full max-w-md bg-dark-surface rounded-3xl border border-dark-border p-4" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">Synth</Text>
            <Pressable onPress={() => setShowPresets(!showPresets)}
              className="px-3 py-1 rounded-lg bg-dark-muted border border-dark-border active:opacity-70">
              <Text className="text-gray-300 text-xs">{preset.name}</Text>
            </Pressable>
          </View>

          {showPresets && (
            <View className="flex-row flex-wrap gap-1 mb-3 p-2 bg-dark-bg rounded-xl border border-dark-border" style={{ maxHeight: 120 }}>
              {PRESETS.map((p, i) => (
                <Pressable key={p.name} onPress={() => { setPresetIndex(i); setShowPresets(false); }}
                  className={`px-2 py-0.5 rounded-lg border ${i === presetIndex ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-muted border-dark-border'}`}>
                  <Text className={`text-[9px] ${i === presetIndex ? 'text-brand-accent' : 'text-gray-300'}`}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-dark-bg rounded-xl p-2 border border-dark-border">
              <Text className="text-gray-400 text-[9px] mb-1">Osc 1</Text>
              <Text className="text-white text-xs">{preset.osc1.waveform} ({preset.osc1.level}%)</Text>
              <Text className="text-gray-500 text-[8px]">Detune: {preset.osc1.detune}ct</Text>
            </View>
            <View className="flex-1 bg-dark-bg rounded-xl p-2 border border-dark-border">
              <Text className="text-gray-400 text-[9px] mb-1">Osc 2</Text>
              <Text className="text-white text-xs">{preset.osc2.waveform} ({preset.osc2.level}%)</Text>
              <Text className="text-gray-500 text-[8px]">Detune: {preset.osc2.detune}ct</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-dark-bg rounded-xl p-2 border border-dark-border">
              <Text className="text-gray-400 text-[9px] mb-1">Filter</Text>
              <Text className="text-white text-xs">{preset.filter.type.toUpperCase()}</Text>
              <Text className="text-gray-500 text-[8px]">{preset.filter.cutoff}Hz · {preset.filter.resonance}%</Text>
            </View>
            <View className="flex-1 bg-dark-bg rounded-xl p-2 border border-dark-border">
              <Text className="text-gray-400 text-[9px] mb-1">ADSR</Text>
              <Text className="text-white text-xs">
                A{preset.adsr.attack} D{preset.adsr.decay}
              </Text>
              <Text className="text-gray-500 text-[8px]">
                S{preset.adsr.sustain}% R{preset.adsr.release}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-dark-bg rounded-xl p-2 border border-dark-border">
              <Text className="text-gray-400 text-[9px] mb-1">LFO</Text>
              <Text className="text-white text-xs">{preset.lfo.rate}Hz → {preset.lfo.target}</Text>
              <Text className="text-gray-500 text-[8px]">Depth: {preset.lfo.depth}%</Text>
            </View>
            <View className="flex-1 bg-dark-bg rounded-xl p-2 border border-dark-border">
              <Text className="text-gray-400 text-[9px] mb-1">Arp</Text>
              <Text className="text-white text-xs">{preset.arp.enabled ? preset.arp.direction : 'OFF'}</Text>
              <Text className="text-gray-500 text-[8px]">{preset.arp.rate} · {preset.arp.octaves}oct</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-4">
            <Pressable onPress={() => playNote(60)} className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border items-center active:opacity-70">
              <Text className="text-gray-300 text-xs font-semibold">Play C4</Text>
            </Pressable>
            <Pressable onPress={() => playNote(64)} className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border items-center active:opacity-70">
              <Text className="text-gray-300 text-xs font-semibold">Play E4</Text>
            </Pressable>
            <Pressable onPress={() => playNote(67)} className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border items-center active:opacity-70">
              <Text className="text-gray-300 text-xs font-semibold">Play G4</Text>
            </Pressable>
            <Pressable onPress={preset.arp.enabled ? playArp : () => playNote(72)}
              className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border items-center active:opacity-70">
              <Text className="text-gray-300 text-xs font-semibold">{preset.arp.enabled ? 'Arp' : 'C5'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={stopAll}
            className="py-2 rounded-xl bg-dark-muted border border-dark-border items-center mb-3 active:opacity-70">
            <Text className="text-gray-400 text-xs">{playing ? 'Stop' : '—'}</Text>
          </Pressable>

          <Pressable onPress={onClose} className="py-3 rounded-xl border border-dark-border items-center active:opacity-70">
            <Text className="text-gray-400 text-sm font-semibold">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const SYNTH_PRESETS = PRESETS;
